import type { PoolClient } from "pg";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { audited } from "./audit";
import {
	boundedBody,
	environment,
	guardWrite,
	HttpError,
	mac,
	equal,
	roleFor,
	type Staff,
	type Environment,
} from "./security";
import {
	approvedLink,
	qaFields,
	qaFreshness,
	qaStatus,
	manualQA,
	ingest,
	manualSource,
	severity,
} from "./qa";
import { reportResponse } from "./reports";
const label = (n: number) => z.string().trim().min(1).max(n);
const state = z.enum(["investigating", "identified", "monitoring", "resolved"]);
const evidence = z.discriminatedUnion("type", [
	z.strictObject({ type: z.literal("downtime"), id: z.uuid() }),
	z.strictObject({ type: z.literal("metric"), id: z.uuid() }),
	z.strictObject({ type: z.literal("qa"), id: z.uuid() }),
	z.strictObject({
		type: z.literal("check"),
		id: z.uuid(),
		slot: z.iso.datetime(),
	}),
	z.strictObject({
		type: z.literal("security"),
		url: z
			.string()
			.max(2048)
			.refine((s) => approvedLink(s)),
	}),
]);
const references = z.array(evidence).max(10).default([]);
const incident = z.strictObject({
	serviceId: z.uuid(),
	environment,
	title: label(200),
	severity,
	startedAt: z.iso.datetime().nullable(),
	message: label(4000),
	owner: label(120).optional(),
	evidence: references,
});
const update = z.strictObject({
	status: state,
	message: label(4000),
	occurredAt: z.iso.datetime(),
	evidence: references,
});
const windowInput = z.strictObject({
	serviceId: z.uuid(),
	environment,
	title: label(200),
	reason: label(1000),
	startsAt: z.iso.datetime(),
	endsAt: z.iso.datetime(),
});
export function canTransition(
	from: z.infer<typeof state>,
	to: z.infer<typeof state>,
) {
	return (
		from !== "resolved" &&
		(from === to ||
			to === "resolved" ||
			to === "investigating" ||
			from === "investigating" ||
			(from === "identified" && to === "monitoring") ||
			(from === "monitoring" && to === "identified"))
	);
}
const incidentCols =
	'id,service_id AS "serviceId",environment,title,severity,owner_name AS owner,created_by AS "createdBy",created_at AS "createdAt",started_at AS "startedAt",updated_at AS "updatedAt",resolved_at AS "resolvedAt",version,status';
const windowCols =
	'id,service_id AS "serviceId",environment,title,coalesce(reason,approval_reference) AS reason,starts_at AS "startsAt",ends_at AS "endsAt",cancelled_at AS "cancelledAt",version';
async function checkService(c: PoolClient, id: string, env: Environment) {
	if (
		!(
			await c.query("SELECT 1 FROM services WHERE id=$1 AND environment=$2", [
				id,
				env,
			])
		).rowCount
	)
		throw new HttpError(404, "service_not_found");
}
async function checkEvidence(
	c: PoolClient,
	env: Environment,
	service: string,
	refs: z.infer<typeof references>,
) {
	for (const r of refs) {
		if (r.type === "security") {
			if (
				!(
					await c.query(
						"SELECT 1 FROM qa_runs WHERE environment=$1 AND service_id=$2 AND (payload->'securityFindings') @> $3::jsonb LIMIT 1",
						[env, service, JSON.stringify([{ url: r.url }])],
					)
				).rowCount
			)
				throw new HttpError(400, "evidence_out_of_scope");
			continue;
		}
		const sql =
			r.type === "qa"
				? "SELECT 1 FROM qa_runs WHERE environment=$1 AND service_id=$2 AND id=$3 AND payload->>'status' IN ('failed','error')"
				: r.type === "metric"
					? "SELECT 1 FROM metric_snapshots WHERE environment=$1 AND service_id=$2 AND id=$3"
					: r.type === "check"
						? "SELECT 1 FROM health_checks h JOIN endpoints e ON h.endpoint_id=e.id WHERE h.environment=$1 AND e.service_id=$2 AND e.id=$3 AND h.scheduled_slot=$4"
						: "SELECT 1 FROM downtime_events d JOIN endpoints e ON d.endpoint_id=e.id WHERE d.environment=$1 AND e.service_id=$2 AND d.id=$3";
		if (
			!(
				await c.query(
					sql,
					r.type === "check"
						? [env, service, r.id, r.slot]
						: [env, service, r.id],
				)
			).rowCount
		)
			throw new HttpError(400, "evidence_out_of_scope");
	}
}
async function resource(
	c: PoolClient,
	group: "incidents" | "maintenance",
	id: string,
	staff: Staff,
) {
	const r = (
		await c.query(
			`SELECT ${group === "incidents" ? incidentCols : windowCols} FROM ${group === "incidents" ? "incidents" : "maintenance_windows"} WHERE id=$1 AND environment=ANY($2::environment_name[])`,
			[z.uuid().parse(id), staff.memberships.map((m) => m.environment)],
		)
	).rows[0];
	if (!r) throw new HttpError(404, "not_found");
	return r;
}
function paging(q: URLSearchParams, staff: Staff, path: string[]) {
	const limit = z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.parse(q.get("limit") ?? 50),
		value = q.get("cursor"),
		offset = value ? Number(value.split(".")[0]) : 0;
	const scope = JSON.stringify([
		staff.id,
		path,
		[...q].filter(([k]) => k !== "cursor").sort(),
	]);
	const sign = (n: number) => n + "." + mac("operations-page", scope + n);
	if (
		!Number.isInteger(offset) ||
		offset < 0 ||
		offset > 100000 ||
		(value && !equal(value, sign(offset)))
	)
		throw new HttpError(400, "invalid_cursor");
	return {
		limit,
		offset,
		page: (rows: Record<string, unknown>[]) => ({
			items: rows.slice(0, limit),
			nextCursor: rows.length > limit ? sign(offset + limit) : null,
		}),
	};
}
async function list(
	c: PoolClient,
	staff: Staff,
	path: string[],
	q: URLSearchParams,
) {
	const env = environment.parse(q.get("environment"));
	roleFor(staff, env);
	const { limit, offset, page } = paging(q, staff, path),
		route = path.join("/");
	if (path.length === 3 && path[0] === "incidents" && path[2] === "updates") {
		const r = await resource(c, "incidents", path[1], staff);
		if (r.environment !== env) throw new HttpError(404, "not_found");
		return page(
			(
				await c.query(
					'SELECT version,actor,occurred_at AS "occurredAt",recorded_at AS "recordedAt",status,message,evidence FROM incident_updates WHERE incident_id=$1 ORDER BY version LIMIT $2 OFFSET $3',
					[r.id, limit + 1, offset],
				)
			).rows,
		);
	}
	if (route === "incidents" || route === "maintenance")
		return page(
			(
				await c.query(
					`SELECT ${route === "incidents" ? incidentCols : windowCols} FROM ${route === "incidents" ? "incidents" : "maintenance_windows"} WHERE environment=$1 ORDER BY ${route === "incidents" ? "created_at" : "starts_at"} DESC,id LIMIT $2 OFFSET $3`,
					[env, limit + 1, offset],
				)
			).rows,
		);
	if (route !== "qa/runs" && route !== "security/findings")
		throw new HttpError(404, "not_found");
	const service = q.has("serviceId")
			? z.uuid().parse(q.get("serviceId"))
			: null,
		suite = q.has("suite") ? label(200).parse(q.get("suite")) : null,
		status = q.has("status") ? qaStatus.parse(q.get("status")) : null;
	const start = q.has("start")
			? z.iso.datetime().parse(q.get("start"))
			: new Date(Date.now() - 30 * 86400000).toISOString(),
		end = q.has("end")
			? z.iso.datetime().parse(q.get("end"))
			: new Date(Date.now() + 120000).toISOString();
	if (
		Date.parse(end) <= Date.parse(start) ||
		Date.parse(end) - Date.parse(start) > 366 * 86400000 + 120000
	)
		throw new HttpError(400, "invalid_period");
	const where =
		"environment=$1 AND ($2::uuid IS NULL OR service_id=$2) AND ($3::text IS NULL OR payload->>'suiteName'=$3) AND ($4::text IS NULL OR payload->>'status'=$4) AND completed_at>=$5 AND completed_at<$6";
	const params = [env, service, suite, status, start, end];
	if (route === "security/findings")
		return page(
			(
				await c.query(
					`SELECT f.item AS finding,id AS "runId",service_id AS "serviceId",method AS "sourceMethod",completed_at AS "observedAt" FROM qa_runs CROSS JOIN LATERAL jsonb_array_elements(payload->'securityFindings') WITH ORDINALITY f(item,n) WHERE ${where} ORDER BY completed_at DESC,id,f.n LIMIT $7 OFFSET $8`,
					[...params, limit + 1, offset],
				)
			).rows,
		);
	const rows = await c.query(
		`SELECT ${qaFields} FROM qa_runs WHERE ${where} ORDER BY completed_at DESC,id LIMIT $7 OFFSET $8`,
		[...params, limit + 1, offset],
	);
	const totals = (
		await c.query(
			`SELECT max(received_at) FILTER(WHERE method='webhook') AS "lastWebhookAt",count(*)::int AS runs,count(*) FILTER(WHERE payload->>'status'='passed')::int AS "passedRuns",count(*) FILTER(WHERE payload->>'status'='failed')::int AS "failedRuns",
 ${["passed", "failed", "skipped", "flaky"].map((k) => `coalesce(sum((payload->'counts'->>'${k}')::int),0)::float8 AS ${k}`).join(",")} FROM qa_runs WHERE ${where}`,
			params,
		)
	).rows[0];
	const cadences: Record<string, number> = JSON.parse(
		process.env.KBEAN_QA_CADENCES ?? "{}",
	);
	return {
		...page(
			rows.rows.map((r) => ({
				...r,
				freshness: qaFreshness(
					r.run.completedAt,
					cadences[
						JSON.stringify([
							r.run.environment,
							r.run.serviceId,
							r.run.suiteName,
						])
					],
				),
			})),
		),
		totals,
	};
}
function revision(req: Request) {
	return Number(
		z
			.string()
			.regex(/^"[1-9]\d{0,8}"$/)
			.parse(req.headers.get("If-Match"))
			.slice(1, -1),
	);
}
export async function operationsRoute(
	req: NextRequest,
	c: PoolClient,
	staff: Staff,
	token: string,
	path: string[],
	headers: Headers,
) {
	const route = path.join("/"),
		q = req.nextUrl.searchParams;
	if (req.method === "GET") {
		if (route === "reports/attention") {
			const env = environment.parse(q.get("environment"));
			roleFor(staff, env);
			return Response.json(
				(
					await c.query(
						`SELECT now() AS "observedAt",
 (SELECT count(*)::int FROM downtime_events WHERE environment=$1 AND resolved_at IS NULL) AS "activeDowntime",
 (SELECT count(*)::int FROM qa_runs WHERE environment=$1 AND completed_at>=now()-interval '1 day' AND payload->>'status' IN ('failed','error')) AS "qaFailures",
 (SELECT count(*)::int FROM incidents WHERE environment=$1 AND status<>'resolved') AS "openIncidents",
 (SELECT count(*)::int FROM maintenance_windows WHERE environment=$1 AND cancelled_at IS NULL AND starts_at<=now() AND ends_at>now()) AS maintenance,
 (SELECT count(*)::int FROM metric_snapshots WHERE environment=$1 AND current_value AND observed_at BETWEEN now()-interval '1 day' AND now()) AS metrics`,
						[env],
					)
				).rows[0],
				{ headers },
			);
		}
		if (route === "reports/summary" || route === "reports/export")
			return reportResponse(c, staff, q, route.endsWith("export"), headers);
		return Response.json(await list(c, staff, path, q), { headers });
	}
	guardWrite(req, token, req.headers.get("X-CSRF-Token"));
	const key = z
		.string()
		.regex(/^[\w-]{16,128}$/)
		.parse(req.headers.get("Idempotency-Key"));
	if (req.headers.get("content-type")?.split(";")[0] !== "application/json")
		throw new HttpError(400, "expected_json");
	const raw = JSON.parse(
		await boundedBody(req, route === "qa/imports" ? 131072 : 65536),
	);
	function writer(env: Environment) {
		if (roleFor(staff, env) === "viewer")
			throw new HttpError(403, "operator_required");
	}
	if (req.method === "POST" && route === "qa/imports") {
		const data = manualQA.parse(raw),
			r = data.run;
		writer(r.environment);
		const result = await audited(
			c,
			staff.id,
			r.environment,
			"qa.manual",
			key,
			data,
			() =>
				ingest(
					c,
					r,
					manualSource(r.environment, r.serviceId),
					data.sourceReference,
					staff.id,
				),
		);
		return Response.json(result.item, { status: result.status, headers });
	}
	let result: { version: number },
		statusCode = 200;
	if (route === "incidents" && req.method === "POST") {
		const b = incident.parse(raw);
		writer(b.environment);
		if (b.startedAt && Date.parse(b.startedAt) > Date.now())
			throw new HttpError(400, "future_start");
		result = await audited(
			c,
			staff.id,
			b.environment,
			"incident.create",
			key,
			b,
			async () => {
				await checkService(c, b.serviceId, b.environment);
				await checkEvidence(c, b.environment, b.serviceId, b.evidence);
				const r = (
					await c.query(
						`INSERT INTO incidents(service_id,environment,title,severity,owner_name,created_by,started_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${incidentCols}`,
						[
							b.serviceId,
							b.environment,
							b.title,
							b.severity,
							b.owner ?? staff.email,
							staff.id,
							b.startedAt,
						],
					)
				).rows[0];
				await c.query(
					"INSERT INTO incident_updates(incident_id,version,actor,occurred_at,status,message,evidence) VALUES($1,1,$2,$3,'investigating',$4,$5)",
					[r.id, staff.id, r.createdAt, b.message, JSON.stringify(b.evidence)],
				);
				return r;
			},
		);
		statusCode = 201;
	} else if (
		req.method === "POST" &&
		path.length === 3 &&
		path[0] === "incidents" &&
		path[2] === "updates"
	) {
		const r = await resource(c, "incidents", path[1], staff),
			rev = revision(req),
			b = update.parse(raw);
		writer(r.environment);
		result = await audited(
			c,
			staff.id,
			r.environment,
			"incident.update." + r.id,
			key,
			[rev, b],
			async () => {
				if (r.version !== rev) throw new HttpError(409, "revision_conflict");
				if (
					!canTransition(r.status, b.status) ||
					Date.parse(b.occurredAt) < +new Date(r.updatedAt) ||
					Date.parse(b.occurredAt) > Date.now()
				)
					throw new HttpError(400, "invalid_transition");
				await checkEvidence(c, r.environment, r.serviceId, b.evidence);
				const next = (
					await c.query(
						`UPDATE incidents SET status=$2,updated_at=$3,resolved_at=CASE WHEN $2='resolved' THEN $3::timestamptz END,version=version+1 WHERE id=$1 AND version=$4 RETURNING ${incidentCols}`,
						[r.id, b.status, b.occurredAt, rev],
					)
				).rows[0];
				if (!next) throw new HttpError(409, "revision_conflict");
				await c.query(
					"INSERT INTO incident_updates(incident_id,version,actor,occurred_at,status,message,evidence) VALUES($1,$2,$3,$4,$5,$6,$7)",
					[
						r.id,
						next.version,
						staff.id,
						b.occurredAt,
						b.status,
						b.message,
						JSON.stringify(b.evidence),
					],
				);
				return next;
			},
		);
	} else if (
		(route === "maintenance" && req.method === "POST") ||
		(path.length === 2 && path[0] === "maintenance" && req.method === "PATCH")
	) {
		const previous = path[1]
				? await resource(c, "maintenance", path[1], staff)
				: null,
			rev = previous ? revision(req) : null;
		const cancel = previous && raw?.cancelled === true,
			b = cancel ? null : windowInput.parse(raw);
		if (cancel) z.strictObject({ cancelled: z.literal(true) }).parse(raw);
		const env = previous?.environment ?? b?.environment;
		writer(env);
		result = await audited(
			c,
			staff.id,
			env,
			previous ? "maintenance.edit." + previous.id : "maintenance.create",
			key,
			[rev, raw],
			async () => {
				if (
					previous &&
					(rev !== previous.version ||
						previous.cancelledAt ||
						+new Date(previous.startsAt) <= Date.now())
				)
					throw new HttpError(409, "window_locked");
				if (b) {
					await checkService(c, b.serviceId, b.environment);
					if (
						previous &&
						(b.serviceId !== previous.serviceId || b.environment !== env)
					)
						throw new HttpError(400, "scope_immutable");
					if (
						Date.parse(b.startsAt) <= Date.now() ||
						Date.parse(b.endsAt) <= Date.parse(b.startsAt) ||
						Date.parse(b.endsAt) - Date.parse(b.startsAt) > 30 * 86400000
					)
						throw new HttpError(400, "invalid_window");
				}
				const saved = cancel
					? await c.query(
							`UPDATE maintenance_windows SET cancelled_at=now(),version=version+1 WHERE id=$1 AND version=$2 RETURNING ${windowCols}`,
							[previous.id, rev],
						)
					: previous && b
						? await c.query(
								`UPDATE maintenance_windows SET title=$3,reason=$4,starts_at=$5,ends_at=$6,version=version+1 WHERE id=$1 AND version=$2 RETURNING ${windowCols}`,
								[previous.id, rev, b.title, b.reason, b.startsAt, b.endsAt],
							)
						: b
							? await c.query(
									`INSERT INTO maintenance_windows(service_id,environment,title,reason,starts_at,ends_at,created_by,approval_reference) VALUES($1,$2,$3,$4,$5,$6,$7,'staff schedule') RETURNING ${windowCols}`,
									[
										b.serviceId,
										env,
										b.title,
										b.reason,
										b.startsAt,
										b.endsAt,
										staff.id,
									],
								)
							: null;
				if (!saved?.rowCount) throw new HttpError(409, "revision_conflict");
				return saved.rows[0];
			},
		);
		statusCode = previous ? 200 : 201;
	} else throw new HttpError(405, "invalid_method");
	headers.set("ETag", '"' + result.version + '"');
	return Response.json(result, { status: statusCode, headers });
}

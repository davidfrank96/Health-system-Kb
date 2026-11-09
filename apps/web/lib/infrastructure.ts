import { audited } from "./audit";
import { checkedMetricPage } from "./metric-output";
import type { PoolClient, QueryResult } from "pg";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
	manualInput,
	metricName,
	provider,
	type ManualRow,
} from "../../../infrastructure/metrics";
import {
	contentDigest,
	CsvError,
	previewCsv,
} from "../../../infrastructure/imports";
import {
	boundedBody,
	environment,
	guardWrite,
	HttpError,
	mac,
	roleFor,
	type Staff,
	type Environment,
} from "./security";
const snapshotFields = `id,resource_id AS "resourceId",service_id AS "serviceId",environment,provider,metric_name AS "metricName",unit,aggregation,value,observed_at AS "observedAt",collected_at AS "collectedAt",ingested_at AS "ingestedAt",source_method AS "sourceMethod",source_reference AS "sourceReference",entered_by AS "enteredBy",note,
 CASE WHEN observed_at < now()-CASE WHEN source_method='provider_api' THEN interval '45 minutes' ELSE interval '24 hours' END THEN 'stale' ELSE 'fresh' END AS quality`;
const resourceFields = `i.id,i.service_id AS "serviceId",s.name AS "serviceName",i.name,CASE WHEN i.enabled THEN 'api' ELSE 'disabled' END AS mode, CASE WHEN NOT i.enabled THEN 'Collection disabled' END AS "disabledReason",NULL::int AS "remainingUsageUnits",i.environment,i.provider,i.resource_type AS "resourceType",i.region,i.identifier,i.enabled,i.version,i.permission_reviewed AS "permissionReviewed",i.cost_status AS "costStatus",i.expires_at AS "approvalExpiresAt",i.last_success AS "lastSuccessAt",i.collection_state AS "collectionState",ARRAY(SELECT metric_name FROM resource_capabilities WHERE resource_id=i.id ORDER BY metric_name) AS capabilities`;
async function validateServices(
	c: PoolClient,
	env: Environment,
	rows: ManualRow[],
) {
	const ids = [...new Set(rows.map((r) => r.serviceId))];
	return new Set(
		(
			await c.query(
				"SELECT id FROM services WHERE environment=$1 AND id=ANY($2::uuid[])",
				[env, ids],
			)
		).rows.map((r) => r.id),
	);
}
async function writeRows(
	c: PoolClient,
	env: Environment,
	actor: string,
	method: "csv" | "manual",
	rows: ManualRow[],
	digest: string,
) {
	const batch = (
		await c.query(
			"INSERT INTO import_batches(environment,actor,digest) VALUES($1,$2,$3) RETURNING id",
			[env, actor, contentDigest([method, digest])],
		)
	).rows[0].id;
	const result = await c.query(
		`INSERT INTO manual_readings(service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_method,source_reference,note,entered_by,batch_id,supersedes_id,correction_reason)
 SELECT x."serviceId",$2,x.provider,x."metricName",x.unit,x.aggregation,x.value,x."observedAt",$3,x."sourceReference",x.note,$4,$5,x."supersedesId",x."correctionReason"
 FROM jsonb_to_recordset($1::jsonb) AS x("serviceId" uuid,provider text,"metricName" text,unit text,aggregation text,value float8,"observedAt" timestamptz,"sourceReference" text,note text,"supersedesId" uuid,"correctionReason" text)
 RETURNING ${snapshotFields}`,
		[JSON.stringify(rows), env, method, actor, batch],
	);
	return method === "manual"
		? result.rows[0]
		: {
				batchId: batch,
				digest,
				dryRun: false,
				validRows: rows.length,
				invalidRows: 0,
				errors: [],
			};
}
export async function infrastructureRoute(
	req: NextRequest,
	c: PoolClient,
	staff: Staff,
	token: string,
	path: string[],
	headers: Headers,
) {
	const [group, op] = path,
		q = req.nextUrl.searchParams;
	if (path.length > 2) throw new HttpError(404, "not_found");
	if (req.method === "GET") {
		const env = environment.parse(q.get("environment"));
		roleFor(staff, env);
		const limit = z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.parse(q.get("limit") ?? 50);
		const scope =
			[...q]
				.filter(([k]) => k !== "cursor")
				.sort()
				.join("/") +
			path.join("/") +
			staff.id;
		const cursor = q.get("cursor"),
			offset = cursor ? Number(cursor.split(".")[0]) : 0;
		const sign = (n: number) => n + "." + mac("metric-page", scope + "/" + n);
		if (
			!Number.isSafeInteger(offset) ||
			offset < 0 ||
			offset > 100000 ||
			(cursor && cursor !== sign(offset))
		)
			throw new HttpError(400, "invalid_cursor");
		const p = q.has("provider") ? provider.parse(q.get("provider")) : null;
		let result: QueryResult;
		if (group === "integrations" && !op)
			result = await c.query(
				`SELECT ${resourceFields} FROM integrations i JOIN services s ON s.id=i.service_id WHERE i.environment=$1 AND ($2::text IS NULL OR provider=$2) ORDER BY i.id LIMIT $3 OFFSET $4`,
				[env, p, limit + 1, offset],
			);
		else if (group === "metrics" && op === "series") {
			result = await c.query(
				`SELECT DISTINCT service_id AS "serviceId",resource_id AS "resourceId",provider,metric_name AS "metricName",source_method AS "sourceMethod",d.unit,'archived' AS quality FROM metric_daily JOIN metric_definitions d ON d.name=metric_name WHERE environment=$1 AND ($2::text IS NULL OR provider=$2) AND day>=current_date-90 ORDER BY 1,2,3,4,5 LIMIT $3 OFFSET $4`,
				[env, p, limit + 1, offset],
			);
		} else if (group === "metrics" && (op === "latest" || op === "history")) {
			const service = q.has("serviceId")
					? z.uuid().parse(q.get("serviceId"))
					: null,
				metric = q.has("metricName")
					? metricName.parse(q.get("metricName"))
					: null;
			if (op === "history" && (!service || !metric))
				throw new HttpError(400, "missing_series");
			if (q.has("resolution"))
				z.enum(["daily", "raw"]).parse(q.get("resolution"));
			const end =
					op === "history"
						? new Date(z.iso.datetime().parse(q.get("end")))
						: new Date(),
				start =
					op === "history"
						? new Date(z.iso.datetime().parse(q.get("start")))
						: new Date(+end - 30 * 86400000);
			if (
				+end <= +start ||
				+end - +start > 90 * 86400000 ||
				+end > Date.now() + 120000
			)
				throw new HttpError(400, "invalid_window");
			const args = [env, p, service, metric, start, end, limit + 1, offset];
			const filter =
				"environment=$1 AND ($2::text IS NULL OR provider=$2) AND ($3::uuid IS NULL OR service_id=$3) AND ($4::text IS NULL OR metric_name=$4)";
			if (op === "history" && q.get("resolution") === "daily") {
				result = await c.query(
					`WITH samples AS (
 SELECT resource_id,provider,source_method,date_trunc('day',observed_at) AS day,count(*) AS n,sum(value::numeric) AS total,min(value) AS lo,max(value) AS hi FROM metric_snapshots WHERE ${filter} AND current_value AND observed_at>=$5 AND observed_at<=$6 GROUP BY 1,2,3,4
 UNION ALL SELECT resource_id,provider,source_method,day::timestamptz,sample_count,total,minimum,maximum FROM metric_daily WHERE ${filter} AND day>=$5::timestamptz AND day+1<=$6::timestamptz)
 SELECT resource_id AS "resourceId",provider,source_method AS "sourceMethod",day AS "observedAt",sum(n)::int AS samples,min(lo) AS minimum,max(hi) AS maximum,(sum(total)/sum(n))::float8 AS mean FROM samples GROUP BY 1,2,3,4 ORDER BY day DESC,provider,resource_id,source_method LIMIT $7 OFFSET $8`,
					args,
				);
			} else {
				if (+end - +start > 30 * 86400000)
					throw new HttpError(400, "daily_resolution_required");
				result = await c.query(
					`SELECT * FROM (SELECT ${op === "latest" ? "DISTINCT ON (service_id,resource_id,provider,metric_name,source_method)" : ""} ${snapshotFields} FROM metric_snapshots WHERE ${filter} AND current_value AND observed_at BETWEEN $5 AND $6 ${op === "latest" ? "ORDER BY service_id,resource_id,provider,metric_name,source_method,observed_at DESC,id" : ""}) readings ORDER BY "observedAt" DESC,id LIMIT $7 OFFSET $8`,
					args,
				);
			}
		} else throw new HttpError(404, "not_found");
		return Response.json(
			{
				items: checkedMetricPage(
					result.rows.slice(0, limit),
					group,
					op,
					q.get("resolution"),
				),
				nextCursor: result.rows.length > limit ? sign(offset + limit) : null,
			},
			{ headers },
		);
	}
	guardWrite(req, token, req.headers.get("X-CSRF-Token"));
	const key = z
		.string()
		.regex(/^[\w-]{16,128}$/)
		.parse(req.headers.get("Idempotency-Key"));
	const mime = req.headers.get("content-type")?.split(";")[0];
	if (group === "integrations" && op && req.method === "PATCH") {
		const id = z.uuid().parse(op),
			r = (
				await c.query(
					"SELECT environment,version FROM integrations WHERE id=$1 AND environment=ANY($2::environment_name[])",
					[id, staff.memberships.map((m) => m.environment)],
				)
			).rows[0];
		if (!r) throw new HttpError(404, "not_found");
		if (roleFor(staff, r.environment) !== "admin")
			throw new HttpError(403, "admin_required");
		if (mime !== "application/json") throw new HttpError(400, "expected_json");
		const body = z
				.strictObject({ enabled: z.boolean() })
				.parse(JSON.parse(await boundedBody(req))),
			revision = z
				.string()
				.regex(/^"[1-9]\d{0,8}"$/)
				.parse(req.headers.get("If-Match"));
		if (body.enabled) throw new HttpError(409, "live_collection_disabled");
		const result = await audited(
			c,
			staff.id,
			r.environment,
			"integration.update." + id,
			key,
			[body, revision],
			async () => {
				const changed = await c.query(
					"SELECT version FROM disable_metric_resource($1,$2) AS version",
					[id, Number(revision.slice(1, -1))],
				);
				if (!changed.rowCount) throw new HttpError(409, "revision_conflict");
				return (
					await c.query(
						`SELECT ${resourceFields} FROM integrations i JOIN services s ON s.id=i.service_id WHERE i.id=$1`,
						[id],
					)
				).rows[0];
			},
		);
		headers.set("ETag", '"' + result.version + '"');
		return Response.json(result, { headers });
	}
	if (
		group !== "metrics" ||
		req.method !== "POST" ||
		!["imports", "snapshots"].includes(op)
	)
		throw new HttpError(405, "invalid_method");
	if (op === "snapshots") {
		if (mime !== "application/json") throw new HttpError(400, "expected_json");
		const row = manualInput.parse(JSON.parse(await boundedBody(req))),
			env = row.environment;
		if (roleFor(staff, env) === "viewer")
			throw new HttpError(403, "operator_required");
		if (!(await validateServices(c, env, [row])).size)
			throw new HttpError(400, "unknown_service");
		const result = await audited(
			c,
			staff.id,
			env,
			"metric.manual",
			key,
			row,
			() => writeRows(c, env, staff.id, "manual", [row], contentDigest(row)),
		);
		return Response.json(result, { status: 201, headers });
	}
	const env = environment.parse(q.get("environment"));
	if (roleFor(staff, env) === "viewer")
		throw new HttpError(403, "operator_required");
	if (mime !== "text/csv") throw new HttpError(400, "expected_csv");
	const dry = z.enum(["true", "false"]).parse(q.get("dryRun")) === "true";
	let preview: ReturnType<typeof previewCsv>;
	try {
		preview = previewCsv(await boundedBody(req, 262144), env);
	} catch (e) {
		if (e instanceof CsvError) throw new HttpError(400, "invalid_csv");
		throw e;
	}
	const services = await validateServices(c, env, preview.readings);
	for (const [index, row] of preview.readings.entries())
		if (!services.has(row.serviceId)) {
			preview.invalidRows++;
			preview.validRows--;
			if (preview.errors.length < 50)
				preview.errors.push({
					row: preview.rowNumbers[index],
					code: "unknown_service",
					message: "Service unavailable in this environment.",
				});
		}
	if (dry) {
		const conflicts = await c.query(
			`SELECT x.n::int AS index FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY x(row,n)
 JOIN metric_snapshots m ON m.service_id=(x.row->>'serviceId')::uuid AND m.environment=$2 AND m.provider=x.row->>'provider'
 AND m.metric_name=x.row->>'metricName' AND m.observed_at=(x.row->>'observedAt')::timestamptz
 AND m.resource_id IS NULL AND m.current_value AND m.source_method IN ('csv','manual')`,
			[JSON.stringify(preview.readings), env],
		);
		for (const conflict of conflicts.rows) {
			preview.invalidRows++;
			preview.validRows--;
			if (preview.errors.length < 50)
				preview.errors.push({
					row: preview.rowNumbers[conflict.index - 1],
					code: "duplicate_observation",
					message:
						"Reading already exists. Use a manual correction with its ID.",
				});
		}
		const { rowNumbers, ...result } = preview;
		return Response.json(
			{ ...result, batchId: null, dryRun: true },
			{ headers },
		);
	}
	if (preview.invalidRows) throw new HttpError(400, "invalid_rows");
	if (preview.digest !== req.headers.get("X-Preview-Digest"))
		throw new HttpError(409, "preview_changed");
	const result = await audited(
		c,
		staff.id,
		env,
		"metric.csv",
		key,
		preview.digest,
		() => writeRows(c, env, staff.id, "csv", preview.readings, preview.digest),
	);
	return Response.json(result, { headers });
}

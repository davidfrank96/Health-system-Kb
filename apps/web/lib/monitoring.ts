import type { PoolClient } from "pg";
import { z } from "zod";
import { canonicalTarget } from "../../../monitoring/probe.mjs";
import {
	current,
	serviceState,
	type State,
	type Check,
} from "../../../monitoring/model.mjs";
import {
	endpointHistory,
	sumAvailability,
	combineSamples,
	countSamples,
} from "../../../monitoring/store.mjs";
import { getService, listServices } from "./inventory";
import {
	environment,
	roleFor,
	HttpError,
	digest,
	mac,
	equal,
	type Staff,
	type Environment,
} from "./security";

export const endpointInput = z
	.strictObject({
		serviceId: z.uuid(),
		environment,
		url: z.string().max(2048),
		enabled: z.boolean().default(false),
		required: z.boolean().default(true),
		expectedCodes: z
			.array(
				z
					.number()
					.int()
					.min(200)
					.max(599)
					.refine((x) => x < 300 || x > 399),
			)
			.min(1)
			.max(10)
			.default([200]),
		failureThreshold: z.number().int().min(2).max(5).default(2),
		recoveryThreshold: z.number().int().min(2).max(5).default(2),
		slowMs: z.number().int().min(500).max(9000).default(2000),
		clearMs: z.number().int().min(100).max(8000).default(1000),
	})
	.refine((x) => x.clearMs < x.slowMs);
export type EndpointInput = z.infer<typeof endpointInput>;
export interface Endpoint extends EndpointInput {
	id: string;
	version: number;
	approved: boolean;
	approvalReference: string | null;
	approvedAt: string | null;
	state: Partial<State>;
	latest: Check | null;
	condition: ReturnType<typeof current>["condition"];
	quality: ReturnType<typeof current>["quality"];
	reason: string | null;
	maintenance: boolean;
}
const columns = `id,service_id AS "serviceId",environment,url,enabled,required,version,expected_codes AS "expectedCodes",failure_threshold AS "failureThreshold",recovery_threshold AS "recoveryThreshold",slow_ms AS "slowMs",clear_ms AS "clearMs",(approved_url=url AND approved_at IS NOT NULL) AS approved,approval_reference AS "approvalReference",approved_at AS "approvedAt",state,latest`;
function present(row: Endpoint) {
	return {
		...row,
		maintenance: Boolean(row.maintenance),
		...current(
			row.state,
			Date.now(),
			row.enabled,
			row.maintenance,
			row.latest?.failure,
		),
	};
}
function cursor(
	id: string,
	env: Environment,
	actor: string,
	service: string | null,
) {
	return `${id}.${mac("endpoint-cursor", [id, env, actor, service ?? ""].join("/"))}`;
}
export async function listEndpoints(
	c: PoolClient,
	staff: Staff,
	env: Environment,
	limit: number,
	after: string | null,
	service: string | null,
) {
	roleFor(staff, env);
	if (service && (await getService(c, staff, service)).environment !== env)
		throw new HttpError(404, "service_not_found");
	const id = after?.split(".")[0] ?? null;
	if (
		after &&
		(!z.uuid().safeParse(id).success ||
			!equal(after, cursor(id as string, env, staff.id, service)))
	)
		throw new HttpError(400, "invalid_cursor");
	const rows = (
		await c.query<Endpoint>(
			`SELECT ${columns},EXISTS(SELECT 1 FROM maintenance_windows m WHERE m.service_id=endpoints.service_id AND m.environment=endpoints.environment AND now()>=m.starts_at AND now()<m.ends_at) AS maintenance FROM endpoints WHERE environment=$1 AND ($2::uuid IS NULL OR id>$2) AND ($3::uuid IS NULL OR service_id=$3) ORDER BY id LIMIT $4`,
			[env, id, service, limit + 1],
		)
	).rows;
	return {
		items: rows.slice(0, limit).map(present),
		nextCursor:
			rows.length > limit
				? cursor(rows[limit - 1].id, env, staff.id, service)
				: null,
	};
}
export async function saveEndpoint(
	c: PoolClient,
	staff: Staff,
	body: EndpointInput,
	key: string,
	id: string | null,
	revision: string | null,
) {
	const service = await getService(c, staff, body.serviceId);
	if (service.environment !== body.environment)
		throw new HttpError(404, "service_not_found");
	if (roleFor(staff, body.environment) !== "admin")
		throw new HttpError(403, "admin_required");
	let url: string;
	try {
		url = canonicalTarget(body.url);
	} catch {
		const fixture =
			process.env.KBEAN_DB_TIER === "test" &&
			process.env.KBEAN_DB_NAME === "kbean_test" &&
			process.env.KBEAN_LOCAL_FIXTURES === "1" &&
			body.environment === "development";
		const parsed = z.url().safeParse(body.url);
		if (!fixture || !parsed.success) throw new HttpError(400, "unsafe_target");
		const u = new URL(body.url);
		if (
			u.protocol !== "http:" ||
			u.hostname !== "127.0.0.1" ||
			!u.port ||
			u.search ||
			u.hash ||
			u.username ||
			u.password
		)
			throw new HttpError(400, "unsafe_target");
		url = u.href;
	}
	await c.query("SELECT pg_advisory_xact_lock(1262634318,3)");
	const action = id ? `endpoint.update.${id}` : "endpoint.create",
		fingerprint = digest(JSON.stringify([body, revision]));
	const previous = (
		await c.query(
			"SELECT digest,result FROM audit_events WHERE actor=$1 AND action=$2 AND request_key=$3",
			[staff.id, action, key],
		)
	).rows[0];
	if (previous) {
		if (previous.digest !== fingerprint)
			throw new HttpError(409, "key_conflict");
		return previous.result as Endpoint;
	}
	if (id) {
		const old = (
			await c.query<Endpoint>(
				`SELECT ${columns} FROM endpoints WHERE id=$1 AND environment=$2 FOR UPDATE`,
				[id, body.environment],
			)
		).rows[0];
		if (!old) throw new HttpError(404, "endpoint_not_found");
		if (old.serviceId !== body.serviceId)
			throw new HttpError(403, "scope_immutable");
		if (old.version !== Number(revision?.slice(1, -1)))
			throw new HttpError(409, "version_conflict");
		if (body.enabled && (!old.approved || old.url !== url))
			throw new HttpError(409, "target_approval_required");
	} else if (body.enabled) throw new HttpError(409, "target_approval_required");
	const counts = (
		await c.query(
			"SELECT count(*)::int AS total,count(*) FILTER(WHERE enabled AND id<>coalesce($1::uuid,gen_random_uuid()))::int AS active FROM endpoints",
			[id],
		)
	).rows[0];
	if ((!id && counts.total >= 200) || (body.enabled && counts.active >= 20))
		throw new HttpError(409, "monitor_limit");
	if (
		!id &&
		(
			await c.query(
				"SELECT count(*)::int AS n FROM endpoints WHERE service_id=$1",
				[body.serviceId],
			)
		).rows[0].n >= 20
	)
		throw new HttpError(409, "service_monitor_limit");
	const values = [
		body.serviceId,
		body.environment,
		url,
		body.required,
		body.expectedCodes,
		body.failureThreshold,
		body.recoveryThreshold,
		body.slowMs,
		body.clearMs,
	];
	const result = id
		? await c.query<Endpoint>(
				`UPDATE endpoints SET url=$3,required=$4,expected_codes=$5,failure_threshold=$6,recovery_threshold=$7,slow_ms=$8,clear_ms=$9,enabled=$10,version=version+1 WHERE id=$11 AND service_id=$1 AND environment=$2 RETURNING ${columns}`,
				[...values, body.enabled, id],
			)
		: await c.query<Endpoint>(
				`INSERT INTO endpoints(service_id,environment,url,required,expected_codes,failure_threshold,recovery_threshold,slow_ms,clear_ms) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${columns}`,
				values,
			);
	const resultBody = present(result.rows[0]);
	await c.query(
		"INSERT INTO audit_events(actor,environment,action,target,request_key,digest,result) VALUES($1,$2,$3,$4,$5,$6,$7)",
		[
			staff.id,
			body.environment,
			action,
			resultBody.id,
			key,
			fingerprint,
			resultBody,
		],
	);
	return resultBody;
}
export async function statusOverview(
	c: PoolClient,
	staff: Staff,
	env: Environment,
	limit: number,
	after: string | null,
) {
	const services = await listServices(c, staff, env, limit, after);
	const endpoints = (await listEndpoints(c, staff, env, 200, null, null)).items;
	// Only twenty monitors may be enabled; include disabled configs for paged services separately.
	const active = (
		await c.query<Endpoint>(
			`SELECT ${columns},EXISTS(SELECT 1 FROM maintenance_windows m WHERE m.service_id=endpoints.service_id AND m.environment=endpoints.environment AND now()>=m.starts_at AND now()<m.ends_at) AS maintenance FROM endpoints WHERE environment=$1 AND enabled ORDER BY id LIMIT 21`,
			[env],
		)
	).rows.map(present);
	const monitored = new Set(active.map((e) => e.serviceId));
	const states = [...monitored].map((id) =>
		serviceState(active.filter((e) => e.serviceId === id)),
	);
	const total = (
		await c.query(
			"SELECT count(*)::int AS total FROM services WHERE environment=$1",
			[env],
		)
	).rows[0].total;
	const latestRun =
		(
			await c.query(
				`SELECT scheduled_slot AS "scheduledSlot",started_at AS "startedAt",finished_at AS "finishedAt",status,attempts,error_code AS "errorCode" FROM collection_runs WHERE deployment_environment=$1 ORDER BY scheduled_slot DESC LIMIT 1`,
				[process.env.KBEAN_DB_TIER],
			)
		).rows[0] ?? null;
	const items = services.items.map((s) => {
		const list = active.filter((e) => e.serviceId === s.id);
		return {
			...s,
			...serviceState(list),
			monitored: list.length > 0,
			endpoints: endpoints.filter((e) => e.serviceId === s.id),
		};
	});
	const recentFailures = (
		await c.query(
			`SELECT h.endpoint_id AS "endpointId",e.service_id AS "serviceId",s.name,h.scheduled_slot AS "scheduledSlot",h.observed_at AS "observedAt",h.failure,h.outcome FROM health_checks h JOIN endpoints e ON e.id=h.endpoint_id JOIN services s ON s.id=e.service_id WHERE h.environment=$1 AND h.outcome<>'success' ORDER BY h.scheduled_slot DESC LIMIT 10`,
			[env],
		)
	).rows;
	return {
		items,
		nextCursor: services.nextCursor,
		counts: {
			total,
			monitored: monitored.size,
			healthy: states.filter((s) => s.condition === "healthy").length,
			degraded: states.filter((s) => s.condition === "degraded").length,
			down: states.filter((s) => s.condition === "down").length,
			unknown:
				total -
				monitored.size +
				states.filter((s) => s.condition === "unknown").length,
			stale: states.filter((s) => s.quality === "stale").length,
		},
		latestRun: latestRun
			? {
					...latestRun,
					quality:
						Date.now() - Number(new Date(latestRun.startedAt)) > 35 * 60000
							? "stale"
							: latestRun.status === "completed"
								? "fresh"
								: "error",
				}
			: null,
		recentFailures,
		liveCollectionEnabled: false,
	};
}
export async function statusHistory(
	c: PoolClient,
	staff: Staff,
	env: Environment,
	serviceId: string,
	start: Date,
	end: Date,
	limit: number,
	after: string | null,
) {
	roleFor(staff, env);
	const service = await getService(c, staff, serviceId);
	if (service.environment !== env)
		throw new HttpError(404, "service_not_found");
	if (
		+end <= +start ||
		+end - +start > 90 * 86400000 ||
		+end > Date.now() + 120000
	)
		throw new HttpError(400, "invalid_range");
	const endpoints = (await listEndpoints(c, staff, env, 200, null, serviceId))
		.items;
	const all = await Promise.all(
		endpoints.map(async (e) => ({
			endpointId: e.id,
			days: await endpointHistory(c, e.id, start, end),
		})),
	);
	const grouped = new Map<string, string[]>();
	for (const e of all)
		for (const d of e.days)
			grouped.set(d.day, [...(grouped.get(d.day) ?? []), d.samples]);
	const days = [...grouped]
		.map(([day, rows]) => ({ day, ...countSamples(combineSamples(rows)) }))
		.sort((a, b) => a.day.localeCompare(b.day));
	const fingerprint = [
		staff.id,
		env,
		serviceId,
		start.toISOString(),
		end.toISOString(),
	].join("/");
	let offset = 0;
	if (after) {
		const parts = after.split(".");
		offset = Number(parts[0]);
		if (
			!Number.isInteger(offset) ||
			offset < 0 ||
			offset > 92 ||
			!equal(after, `${offset}.${mac("history", `${fingerprint}/${offset}`)}`)
		)
			throw new HttpError(400, "invalid_cursor");
	}
	const events = (
		await c.query(
			`SELECT d.id,d.endpoint_id AS "endpointId",d.first_failed_at AS "firstFailedAt",d.confirmed_at AS "confirmedAt",d.first_recovery_at AS "firstRecoveryAt",d.resolved_at AS "resolvedAt",d.evidence_gap AS "evidenceGap",d.first_failed_slot AS "firstFailedSlot",d.confirmed_slot AS "confirmedSlot",d.recovery_slot AS "recoverySlot" FROM downtime_events d JOIN endpoints e ON e.id=d.endpoint_id WHERE e.service_id=$1 AND d.environment=$2 AND d.confirmed_at<$4 AND (d.resolved_at IS NULL OR d.resolved_at>=$3) ORDER BY d.confirmed_at DESC LIMIT 101`,
			[serviceId, env, start, end],
		)
	).rows;
	return {
		service,
		endpoints,
		method: "15-minute sampled availability",
		start: start.toISOString(),
		end: end.toISOString(),
		summary: sumAvailability(days),
		items: days.slice(offset, offset + limit),
		nextCursor:
			offset + limit < days.length
				? `${offset + limit}.${mac("history", `${fingerprint}/${offset + limit}`)}`
				: null,
		downtimeEvents: events.slice(0, 100),
		eventsTruncated: events.length > 100,
	};
}

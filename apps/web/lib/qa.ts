import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import {
	boundedBytes,
	environment,
	HttpError,
	type Environment,
} from "./security";
import { transaction } from "./db";
const label = (n: number) => z.string().trim().min(1).max(n);
const utc = z.iso.datetime({ precision: undefined });
export const severity = z.enum(["critical", "high", "medium", "low"]);
export const qaStatus = z.enum(["passed", "failed", "cancelled", "error"]);
export function approvedLink(
	input: string,
	hosts = process.env.KBEAN_QA_EVIDENCE_HOSTS ?? "",
) {
	try {
		const u = new URL(input);
		return (
			u.protocol === "https:" &&
			!u.username &&
			!u.password &&
			!u.port &&
			!u.search &&
			!u.hash &&
			hosts.split(",").includes(u.hostname) &&
			!/[\\\s]/.test(input)
		);
	} catch {
		return false;
	}
}
const link = z
	.string()
	.max(2048)
	.refine((s) => approvedLink(s));
const count = z.number().int().min(0).max(1000000);
export const qaRun = z
	.strictObject({
		schemaVersion: z.literal("1"),
		sourceRunId: label(200),
		serviceId: z.uuid(),
		environment,
		suiteName: label(200),
		startedAt: utc,
		completedAt: utc,
		durationMs: z.number().int().nonnegative(),
		status: qaStatus,
		counts: z.strictObject({
			passed: count,
			failed: count,
			skipped: count,
			flaky: count,
		}),
		failures: z
			.array(z.strictObject({ testName: label(200), summary: label(1000) }))
			.max(20),
		evidence: z.array(z.strictObject({ label: label(200), url: link })).max(10),
		securityFindings: z
			.array(
				z.strictObject({
					source: label(100),
					externalId: label(200),
					severity: z.enum([...severity.options, "unknown"]),
					title: label(200),
					url: link,
				}),
			)
			.max(20),
		applicationVersion: label(100).optional(),
	})
	.refine((r) => {
		const end = Date.parse(r.completedAt),
			elapsed = end - Date.parse(r.startedAt);
		return (
			end <= Date.now() + 120000 &&
			end > Date.now() - 366 * 86400000 &&
			elapsed === r.durationMs &&
			r.counts.flaky <= r.counts.passed + r.counts.failed &&
			(r.status !== "passed" ||
				(r.counts.passed > 0 && r.counts.failed === 0 && !r.failures.length)) &&
			(r.status !== "failed" || r.counts.failed > 0)
		);
	});
export type Run = z.infer<typeof qaRun>;
export const manualQA = z.strictObject({
	sourceReference: label(500).refine(
		(s) => !s.includes("://") || approvedLink(s),
	),
	run: qaRun,
});
const keySchema = z.strictObject({
	id: label(80),
	secret: z.string().regex(/^[0-9a-f]{64}$/),
	from: utc,
	until: utc,
});
const config = z
	.strictObject({
		source: label(100),
		environment,
		serviceIds: z.array(z.uuid()).min(1).max(100),
		keys: z.array(keySchema).min(1).max(2),
	})
	.refine(
		(c) =>
			c.keys.every((k) => Date.parse(k.from) < Date.parse(k.until)) &&
			new Set(c.keys.map((k) => k.id)).size === c.keys.length &&
			(c.keys.length === 1 ||
				Math.min(...c.keys.map((k) => Date.parse(k.until))) -
					Math.max(...c.keys.map((k) => Date.parse(k.from))) <=
					86400000),
	);
export function verifySignature(
	headers: Headers,
	bytes: Buffer,
	settings: z.infer<typeof config>,
	now = Date.now(),
) {
	const ts = headers.get("X-Kbean-Timestamp") ?? "",
		event = headers.get("X-Kbean-Event-Id") ?? "",
		sig = headers.get("X-Kbean-Signature") ?? "",
		id = headers.get("X-Kbean-Key-Id");
	const key = settings.keys.find(
		(k) =>
			k.id === id && Date.parse(k.from) <= now && now < Date.parse(k.until),
	);
	if (
		!key ||
		!/^\d{10}$/.test(ts) ||
		Math.abs(Math.floor(now / 1000) - Number(ts)) > 300 ||
		!z.uuid().safeParse(event).success ||
		!/^v1=[0-9a-f]{64}$/.test(sig)
	)
		throw new HttpError(401, "invalid_sender");
	const expected = createHmac("sha256", Buffer.from(key.secret, "hex"))
		.update(ts + "." + event + ".")
		.update(bytes)
		.digest();
	if (!timingSafeEqual(expected, Buffer.from(sig.slice(3), "hex")))
		throw new HttpError(401, "invalid_sender");
	return event.toLowerCase();
}
const hash = (v: string | Buffer) =>
	createHash("sha256").update(v).digest("hex");
export const qaFields =
	'id,received_at AS "receivedAt",method AS "sourceMethod",source_reference AS "sourceReference",actor AS "enteredBy",payload AS run';
export async function ingest(
	c: PoolClient,
	run: Run,
	source: string,
	reference: string,
	actor: string | null,
	delivery?: { id: string; digest: string },
) {
	const digest = hash(JSON.stringify(run)),
		method = delivery ? "webhook" : "manual";
	await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,4))", [
		source,
	]);
	if (
		!(
			await c.query("SELECT id FROM services WHERE environment=$1 AND id=$2", [
				run.environment,
				run.serviceId,
			])
		).rowCount
	)
		throw new HttpError(404, "service_not_found");
	if (delivery) {
		const seen = (
			await c.query(
				"SELECT digest,run_id FROM qa_deliveries WHERE source=$1 AND event_id=$2",
				[source, delivery.id],
			)
		).rows[0];
		if (seen) {
			if (seen.digest !== delivery.digest)
				throw new HttpError(409, "event_conflict");
			return {
				status: 200,
				item: (
					await c.query("SELECT " + qaFields + " FROM qa_runs WHERE id=$1", [
						seen.run_id,
					])
				).rows[0],
			};
		}
	}
	const existing = (
		await c.query(
			"SELECT " +
				qaFields +
				",digest FROM qa_runs WHERE source=$1 AND run_key=$2",
			[source, run.sourceRunId],
		)
	).rows[0];
	if (
		existing &&
		(existing.digest !== digest || existing.sourceReference !== reference)
	)
		throw new HttpError(409, "run_conflict");
	const item =
		existing ??
		(
			await c.query(
				`INSERT INTO qa_runs(service_id,environment,source,run_key,method,actor,source_reference,completed_at,payload,digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${qaFields}`,
				[
					run.serviceId,
					run.environment,
					source,
					run.sourceRunId,
					method,
					actor,
					reference,
					run.completedAt,
					run,
					digest,
				],
			)
		).rows[0];
	delete item.digest;
	if (delivery) {
		await c.query("INSERT INTO qa_deliveries VALUES($1,$2,$3,$4)", [
			source,
			delivery.id,
			item.id,
			delivery.digest,
		]);
		await c.query(
			"INSERT INTO audit_events(environment,action,target) VALUES($1,'qa.delivery',$2)",
			[run.environment, item.id],
		);
	}
	return { status: existing ? 200 : 201, item };
}
let minute = -1,
	attempts = 0,
	accepted = 0;
export async function webhook(req: Request, headers: Headers) {
	if (
		process.env.KBEAN_LOCAL_FIXTURES !== "1" ||
		process.env.KBEAN_DB_TIER !== "test" ||
		process.env.KBEAN_DB_NAME !== "kbean_test" ||
		!process.env.KBEAN_QA_FIXTURE_CONFIG
	)
		throw new HttpError(503, "qa_sender_disabled");
	const settings = config.parse(
		JSON.parse(process.env.KBEAN_QA_FIXTURE_CONFIG),
	);
	const bucket = Math.floor(Date.now() / 60000);
	if (bucket !== minute) {
		minute = bucket;
		attempts = 0;
		accepted = 0;
	}
	if (++attempts > 60) throw new HttpError(429, "sender_rate_limit");
	if (req.headers.get("content-type")?.split(";")[0] !== "application/json")
		throw new HttpError(400, "expected_json");
	const bytes = await boundedBytes(req, 131072),
		event = verifySignature(req.headers, bytes, settings);
	if (++accepted > 30) throw new HttpError(429, "sender_rate_limit");
	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
			bytes,
		);
	} catch {
		throw new HttpError(400, "invalid_encoding");
	}
	const run = qaRun.parse(JSON.parse(text));
	if (
		run.environment !== settings.environment ||
		!settings.serviceIds.includes(run.serviceId)
	)
		throw new HttpError(403, "sender_scope_denied");
	const result = await transaction((c) =>
		ingest(c, run, "webhook/" + settings.source, settings.source, null, {
			id: event,
			digest: hash(bytes),
		}),
	);
	return Response.json(result.item, { status: result.status, headers });
}
export function qaFreshness(completedAt: string, expectedMinutes?: number) {
	if (!expectedMinutes) return "schedule unverified";
	return Date.now() - Date.parse(completedAt) > expectedMinutes * 60000
		? "stale"
		: "fresh";
}
export function manualSource(env: Environment, service: string) {
	return "manual/" + env + "/" + service;
}

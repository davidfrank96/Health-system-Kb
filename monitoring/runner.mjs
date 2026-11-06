import pg from "pg";
import { setTimeout as delay } from "node:timers/promises";
import {
	connectionOptions,
	requireApprovedTest,
} from "../database/connection.mjs";
import { probe, retryable, limits } from "./probe.mjs";
import { slotOf } from "./model.mjs";
import { storeCheck, retain } from "./store.mjs";

// Phase02 exposes controlled test execution only. No environment switch enables live targets.
export async function runFixtures(
	env,
	authority,
	{
		slot = new Date(slotOf(Date.now())),
		timeoutMs = limits.timeoutMs,
		onLocked,
		deadlineMs = limits.deadlineMs,
	} = {},
) {
	requireApprovedTest(env);
	if (!authority || !Array.isArray(authority.urls))
		throw new Error("fixture_authority_required");
	if (+new Date(slot) > Date.now() || +new Date(slot) % 900000)
		throw new Error("invalid_slot");
	const c = new pg.Client(connectionOptions(env, "collector"));
	const controller = new AbortController();
	const started = performance.now(),
		deadline = Math.min(deadlineMs, limits.deadlineMs);
	let lock = false,
		runId,
		attempts = 0,
		connected = false;
	const timer = setTimeout(() => controller.abort(), deadline);
	c.on("error", () => controller.abort());
	c.on("end", () => controller.abort());
	try {
		await c.connect();
		connected = true;
		lock = (
			await c.query("SELECT pg_try_advisory_lock(1262634318,2) AS locked")
		).rows[0].locked;
		if (!lock) return { status: "overlap", attempts: 0 };
		const registered = await c.query(
			`INSERT INTO collection_runs(deployment_environment,scheduled_slot,status) VALUES($1,$2,'running') ON CONFLICT DO NOTHING RETURNING id`,
			[env.KBEAN_DB_TIER, slot],
		);
		if (!registered.rowCount) return { status: "duplicate", attempts: 0 };
		runId = registered.rows[0].id;
		if (onLocked) await onLocked(c);
		const endpoints = (
			await c.query(
				`SELECT * FROM endpoints WHERE enabled ORDER BY id LIMIT 21`,
			)
		).rows;
		if (endpoints.length > limits.endpoints) throw new Error("target_limit");
		let next = 0;
		const results = new Map();
		await Promise.all(
			Array.from(
				{ length: Math.min(limits.concurrency, endpoints.length) },
				async () => {
					while (next < endpoints.length && !controller.signal.aborted) {
						const endpoint = endpoints[next++];
						if (performance.now() - started >= deadline - limits.reserveMs)
							break;
						let result;
						for (let attempt = 1; attempt <= 2; attempt++) {
							if (
								controller.signal.aborted ||
								performance.now() - started >= deadline - limits.reserveMs
							)
								break;
							if (attempts >= limits.attempts) break;
							attempts++;
							result = {
								...(await probe(endpoint.url, endpoint.expected_codes, {
									authority,
									signal: controller.signal,
									timeoutMs,
								})),
								attempts: attempt,
							};
							if (!retryable(result) || attempt === 2) break;
							await delay(1000 + Math.floor(Math.random() * 1000), undefined, {
								signal: controller.signal,
							});
						}
						if (result) results.set(endpoint.id, result);
					}
				},
			),
		);
		controller.signal.throwIfAborted();
		await c.query("BEGIN");
		for (const endpoint of endpoints) {
			controller.signal.throwIfAborted();
			const check = results.get(endpoint.id) ?? {
				outcome: "unknown",
				failure: "collector",
				attempts: 0,
				httpStatus: null,
				latencyMs: null,
				observedAt: new Date().toISOString(),
			};
			await storeCheck(c, endpoint, runId, slot, check);
		}
		await retain(c);
		controller.signal.throwIfAborted();
		const incomplete = results.size < endpoints.length;
		await c.query(
			`UPDATE collection_runs SET status=$3,finished_at=clock_timestamp(),attempts=$2,error_code=$4 WHERE id=$1`,
			[
				runId,
				attempts,
				incomplete ? "error" : "completed",
				incomplete ? "deadline" : null,
			],
		);
		await c.query("COMMIT");
		return {
			status: incomplete ? "error" : "completed",
			attempts,
			runId,
			durationMs: Math.round(performance.now() - started),
		};
	} catch (error) {
		if (connected) {
			await c.query("ROLLBACK").catch(() => {});
			if (runId && !controller.signal.aborted)
				await c
					.query(
						`UPDATE collection_runs SET status='error',finished_at=clock_timestamp(),attempts=$2,error_code=$3 WHERE id=$1`,
						[
							runId,
							attempts,
							error.message === "target_limit" ? "target_limit" : "collector",
						],
					)
					.catch(() => {});
		}
		return { status: "error", attempts, error: "collector" };
	} finally {
		clearTimeout(timer);
		controller.abort();
		if (lock)
			await c.query("SELECT pg_advisory_unlock(1262634318,2)").catch(() => {});
		await c.end().catch(() => {});
	}
}

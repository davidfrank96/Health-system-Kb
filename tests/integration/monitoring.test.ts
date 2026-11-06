import { createServer } from "node:http";
import { expect, test } from "vitest";
import { testClient } from "../support/approved-db.mjs";
import { fixtureAuthority } from "../../monitoring/probe.mjs";
import { runFixtures } from "../../monitoring/runner.mjs";
import { slotOf, SLOT } from "../../monitoring/model.mjs";
import {
	storeCheck,
	retain,
	endpointHistory,
	sumAvailability,
} from "../../monitoring/store.mjs";

test("real finite runs persist HTTP observations, deduplicate before outbound, confirm and recover", async () => {
	const c = await testClient("migrator");
	let status = 500,
		hits = 0;
	const server = createServer((_req, res) => {
		hits++;
		res.writeHead(status);
		res.end();
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/health`;
	const authority = fixtureAuthority(process.env, [url]);
	const service = (
		await c.query(
			"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('development',$1,'Test','Test','normal','synthetic') RETURNING id",
			[crypto.randomUUID()],
		)
	).rows[0];
	const endpoint = (
		await c.query(
			"INSERT INTO endpoints(service_id,environment,url,approved_url,approved_at,approval_reference,enabled) VALUES($1,'development',$2,$2,now(),'synthetic',true) RETURNING *",
			[service.id, url],
		)
	).rows[0];
	const start = slotOf(Date.now()) - 4 * SLOT;
	await c.query("UPDATE endpoints SET enabled_windows=$2 WHERE id=$1", [
		endpoint.id,
		JSON.stringify([{ start: new Date(start).toISOString(), end: null }]),
	]);
	try {
		const r = await runFixtures(process.env, authority, {
			slot: new Date(start),
		});
		expect(r.status).toBe("completed");
		expect(hits).toBe(1);
		expect(
			(await runFixtures(process.env, authority, { slot: new Date(start) }))
				.status,
		).toBe("duplicate");
		expect(hits).toBe(1);
		await runFixtures(process.env, authority, { slot: new Date(start + SLOT) });
		expect(
			(await c.query("SELECT state FROM endpoints WHERE id=$1", [endpoint.id]))
				.rows[0].state.condition,
		).toBe("down");
		status = 200;
		await runFixtures(process.env, authority, {
			slot: new Date(start + 2 * SLOT),
		});
		await runFixtures(process.env, authority, {
			slot: new Date(start + 3 * SLOT),
		});
		const event = (
			await c.query("SELECT * FROM downtime_events WHERE endpoint_id=$1", [
				endpoint.id,
			])
		).rows[0];
		expect(event.resolved_at).not.toBeNull();
		const history = sumAvailability(
			await endpointHistory(
				c,
				endpoint.id,
				new Date(start),
				new Date(start + 4 * SLOT),
			),
		);
		expect(history).toMatchObject({
			expected: 4,
			success: 2,
			failure: 2,
			unknown: 0,
			observed: 0.5,
		});
		expect(
			(
				await c.query(
					"SELECT count(*)::int AS n FROM health_checks WHERE endpoint_id=$1",
					[endpoint.id],
				)
			).rows[0].n,
		).toBe(4);
	} finally {
		await c.query("UPDATE endpoints SET enabled=false WHERE id=$1", [
			endpoint.id,
		]);
		server.closeAllConnections();
		await new Promise<void>((r) => server.close(() => r()));
		await c.end();
	}
}, 20000);

test("dedicated advisory lock prevents overlap and lock connection loss aborts collection", async () => {
	const c = await testClient("collector");
	try {
		await c.query("SELECT pg_advisory_lock(1262634318,2)");
		expect(
			(await runFixtures(process.env, fixtureAuthority(process.env, [])))
				.status,
		).toBe("overlap");
		await c.query("SELECT pg_advisory_unlock(1262634318,2)");
		const slot = new Date(slotOf(Date.now()) - 8 * SLOT);
		const result = await runFixtures(
			process.env,
			fixtureAuthority(process.env, []),
			{
				slot,
				onLocked: async (lock) => {
					await lock.end();
				},
			},
		);
		expect(result).toMatchObject({ status: "error", attempts: 0 });
		expect(
			(
				await c.query(
					"SELECT status FROM collection_runs WHERE scheduled_slot=$1",
					[slot],
				)
			).rows[0].status,
		).toBe("running");
		// A crashed slot is never replayed; next slot remains available.
		expect(
			(
				await runFixtures(process.env, fixtureAuthority(process.env, []), {
					slot,
				})
			).status,
		).toBe("duplicate");
		expect(
			(
				await runFixtures(process.env, fixtureAuthority(process.env, []), {
					slot: new Date(+slot + SLOT),
				})
			).status,
		).toBe("completed");
	} finally {
		await c.end();
	}
});

test("database roles separate configuration, approval and immutable observations; constraints enforce scope", async () => {
	const c = await testClient("migrator"),
		web = await testClient(),
		collector = await testClient("collector");
	try {
		for (const sql of [
			"UPDATE endpoints SET approved_url=url",
			"UPDATE endpoints SET state='{}'",
			"DELETE FROM health_checks",
			"INSERT INTO collection_runs(deployment_environment,scheduled_slot,status) VALUES('test',now(),'running')",
		])
			await expect(web.query(sql)).rejects.toMatchObject({ code: "42501" });
		await expect(
			collector.query("UPDATE endpoints SET enabled=true"),
		).rejects.toMatchObject({ code: "42501" });
		await c.query("BEGIN");
		const service = (
			await c.query(
				"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('staging',$1,'x','x','normal','x') RETURNING id",
				[crypto.randomUUID()],
			)
		).rows[0];
		await expect(
			c.query(
				"INSERT INTO endpoints(service_id,environment,url) VALUES($1,'development','https://example.invalid/')",
				[service.id],
			),
		).rejects.toMatchObject({ code: "23503" });
		await c.query("ROLLBACK");
		expect(
			(await c.query("SELECT 1 FROM services WHERE id=$1", [service.id]))
				.rowCount,
		).toBe(0);
	} finally {
		await Promise.all([c.end(), web.end(), collector.end()]);
	}
});

test("retention preserves failed, unknown, maintenance and disabled counts across raw pruning and repeated rollup", async () => {
	const c = await testClient("migrator");
	await c.query("BEGIN");
	try {
		const day = new Date(Date.UTC(2026, 8, 1));
		const now = new Date(+day + 61 * 86400000);
		const service = (
			await c.query(
				"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('development',$1,'x','x','normal','x') RETURNING id",
				[crypto.randomUUID()],
			)
		).rows[0];
		const endpoint = (
			await c.query(
				"INSERT INTO endpoints(service_id,environment,url,approved_url,approved_at,approval_reference,enabled) VALUES($1,'development','https://fixture.invalid/','https://fixture.invalid/',now(),'fixture',true) RETURNING *",
				[service.id],
			)
		).rows[0];
		await c.query("UPDATE endpoints SET enabled_windows=$2 WHERE id=$1", [
			endpoint.id,
			JSON.stringify([
				{
					start: day.toISOString(),
					end: new Date(+day + 4 * SLOT).toISOString(),
				},
			]),
		]);
		await c.query(
			"INSERT INTO maintenance_windows(service_id,environment,starts_at,ends_at,approval_reference) VALUES($1,'development',$2,$3,'fixture')",
			[service.id, new Date(+day + 3 * SLOT), new Date(+day + 4 * SLOT)],
		);
		for (const [i, outcome] of ["success", "failure"].entries()) {
			const slot = new Date(+day + i * SLOT);
			const run = (
				await c.query(
					"INSERT INTO collection_runs(deployment_environment,scheduled_slot,status) VALUES('test',$1,'running') RETURNING id",
					[slot],
				)
			).rows[0];
			await storeCheck(c, endpoint, run.id, slot, {
				outcome: outcome as "success" | "failure",
				failure: outcome === "success" ? null : "http_status",
				httpStatus: outcome === "success" ? 200 : 500,
				latencyMs: 10,
				attempts: 1,
				observedAt: slot.toISOString(),
			});
		}

		await c.query("UPDATE endpoints SET enabled=false WHERE id=$1", [
			endpoint.id,
		]);
		await c.query("UPDATE endpoints SET enabled_windows=$2 WHERE id=$1", [
			endpoint.id,
			JSON.stringify([
				{
					start: day.toISOString(),
					end: new Date(+day + 4 * SLOT).toISOString(),
					required: true,
				},
			]),
		]);
		await c.query(
			"UPDATE endpoints SET required=false,version=version+1 WHERE id=$1",
			[endpoint.id],
		);
		await retain(c, now);
		await retain(c, now);
		expect(
			(
				await c.query("SELECT 1 FROM health_checks WHERE endpoint_id=$1", [
					endpoint.id,
				])
			).rowCount,
		).toBe(0);
		const counts = sumAvailability(
			await endpointHistory(
				c,
				endpoint.id,
				day,
				new Date(+day + 86400000),
				now,
			),
		);
		expect(counts).toMatchObject({
			expected: 3,
			success: 1,
			failure: 1,
			unknown: 1,
			excluded: 1,
		});
		// Partial-day windows use retained samples rather than daily percentage averaging.
		expect(
			sumAvailability(
				await endpointHistory(
					c,
					endpoint.id,
					new Date(+day + SLOT),
					new Date(+day + 3 * SLOT),
					now,
				),
			),
		).toMatchObject({ expected: 2, success: 0, failure: 1, unknown: 1 });
		const boundary = await endpointHistory(
			c,
			endpoint.id,
			new Date(+day - SLOT),
			new Date(+day + SLOT),
			now,
		);
		expect(boundary.map((d) => d.day)).toEqual(["2026-08-31", "2026-09-01"]);
		await retain(c, new Date(+now + 400 * 86400000));
		expect(
			(
				await c.query(
					"SELECT 1 FROM daily_summaries WHERE endpoint_id=$1 AND day=$2",
					[endpoint.id, day],
				)
			).rowCount,
		).toBe(0);
	} finally {
		await c.query("ROLLBACK");
		await c.end();
	}
});

test("twenty controlled targets stay within four concurrent requests and forty attempts; deadline reserve sends no new probes", async () => {
	const c = await testClient("migrator");
	const seen = new Map<string, number>();
	let active = 0,
		peak = 0;
	const server = createServer((req, res) => {
		active++;
		peak = Math.max(active, peak);
		const path = req.url ?? "/";
		const n = (seen.get(path) ?? 0) + 1;
		seen.set(path, n);
		setTimeout(() => {
			res.writeHead(n === 1 ? 503 : 200);
			res.end();
			active--;
		}, 15);
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
	const service = (
		await c.query(
			"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('development',$1,'Limit fixture','Test','normal','fixture') RETURNING id",
			[crypto.randomUUID()],
		)
	).rows[0];
	const urls = Array.from({ length: 20 }, (_, i) => `${origin}/${i}`);
	try {
		for (const url of urls)
			await c.query(
				"INSERT INTO endpoints(service_id,environment,url,approved_url,approved_at,approval_reference,enabled) VALUES($1,'development',$2,$2,now(),'fixture',true)",
				[service.id, url],
			);
		const slot = new Date(slotOf(Date.now()) - 40 * SLOT);
		const authority = fixtureAuthority(process.env, urls);
		const result = await runFixtures(process.env, authority, { slot });
		expect(result.status).toBe("completed");
		expect(result.attempts).toBe(40);
		expect(peak).toBeLessThanOrEqual(4);
		expect(result.durationMs).toBeLessThan(120000);
		expect([...seen.values()]).toEqual(Array(20).fill(2));
		const reserved = await runFixtures(process.env, authority, {
			slot: new Date(+slot + SLOT),
			deadlineMs: 1000,
		});
		expect(reserved).toMatchObject({ status: "error", attempts: 0 });
		expect([...seen.values()]).toEqual(Array(20).fill(2));
	} finally {
		await c.query("UPDATE endpoints SET enabled=false WHERE service_id=$1", [
			service.id,
		]);
		server.closeAllConnections();
		await new Promise<void>((r) => server.close(() => r()));
		await c.end();
	}
}, 30000);

test("losing the dedicated lock during an in-flight HTTP request cancels I/O and commits no observations", async () => {
	const c = await testClient("migrator");
	let lost: () => void = () => {};
	let hits = 0;
	const server = createServer(() => {
		hits++;
		lost();
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/hold`;
	const service = (
		await c.query(
			"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('development',$1,'Lock fixture','Test','normal','fixture') RETURNING id",
			[crypto.randomUUID()],
		)
	).rows[0];
	const endpoint = (
		await c.query(
			"INSERT INTO endpoints(service_id,environment,url,approved_url,approved_at,approval_reference,enabled) VALUES($1,'development',$2,$2,now(),'fixture',true) RETURNING id",
			[service.id, url],
		)
	).rows[0];
	try {
		const slot = new Date(slotOf(Date.now()) - 50 * SLOT);
		const result = await runFixtures(
			process.env,
			fixtureAuthority(process.env, [url]),
			{
				slot,
				onLocked: async (lock) => {
					lost = () => {
						void lock.end();
					};
				},
			},
		);
		expect(result.status).toBe("error");
		expect(hits).toBe(1);
		expect(
			(
				await c.query("SELECT 1 FROM health_checks WHERE endpoint_id=$1", [
					endpoint.id,
				])
			).rowCount,
		).toBe(0);
		expect(
			(
				await c.query(
					"SELECT status FROM collection_runs WHERE scheduled_slot=$1",
					[slot],
				)
			).rows[0].status,
		).toBe("running");
	} finally {
		await c.query("UPDATE endpoints SET enabled=false WHERE id=$1", [
			endpoint.id,
		]);
		server.closeAllConnections();
		await new Promise<void>((r) => server.close(() => r()));
		await c.end();
	}
});

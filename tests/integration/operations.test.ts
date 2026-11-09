import { test, expect } from "vitest";
import { testClient } from "../support/approved-db.mjs";
import { ingest, type Run } from "../../apps/web/lib/qa";
test("concurrent QA deliveries, conflicts, atomic rollback and immutable attribution", async () => {
	const a = await testClient(),
		b = await testClient(),
		owner = await testClient("migrator");
	try {
		const serviceId = (
				await owner.query(
					"SELECT id FROM services WHERE name='Schema upgrade sentinel'",
				)
			).rows[0].id,
			now = new Date().toISOString(),
			event = crypto.randomUUID(),
			source = "webhook/" + event;
		const run: Run = {
			schemaVersion: "1",
			sourceRunId: "terminal",
			serviceId,
			environment: "staging",
			suiteName: "Contract",
			status: "passed",
			startedAt: now,
			completedAt: now,
			durationMs: 0,
			counts: { passed: 1, failed: 0, skipped: 0, flaky: 1 },
			failures: [],
			evidence: [],
			securityFindings: [],
		};
		const submit = async (
			c: typeof a,
			id: string,
			digest: string,
			rollback = false,
		) => {
			await c.query("BEGIN");
			try {
				const r = await ingest(
					c as unknown as import("pg").PoolClient,
					run,
					source,
					"fixture",
					null,
					{ id, digest },
				);
				await c.query(rollback ? "ROLLBACK" : "COMMIT");
				return r;
			} catch (e) {
				await c.query("ROLLBACK");
				throw e;
			}
		};
		await submit(a, event, "a".repeat(64), true);
		expect(
			(await a.query("SELECT id FROM qa_runs WHERE source=$1", [source]))
				.rowCount,
		).toBe(0);
		const results = await Promise.all([
			submit(a, event, "a".repeat(64)),
			submit(b, event, "a".repeat(64)),
		]);
		expect(results.map((r) => r.status).sort()).toEqual([200, 201]);
		await expect(submit(a, event, "b".repeat(64))).rejects.toMatchObject({
			status: 409,
		});
		const alias = crypto.randomUUID();
		expect((await submit(b, alias, "a".repeat(64))).status).toBe(200);
		run.status = "error";
		await expect(
			submit(a, crypto.randomUUID(), "b".repeat(64)),
		).rejects.toMatchObject({ status: 409 });
		expect(
			(
				await owner.query(
					"SELECT action FROM audit_events WHERE target=$1 AND action='qa.delivery'",
					[results[0].item.id],
				)
			).rowCount,
		).toBe(2);
		await expect(
			a.query("UPDATE qa_runs SET actor=NULL WHERE source=$1", [source]),
		).rejects.toMatchObject({ code: "42501" });
	} finally {
		await Promise.all([a.end(), b.end(), owner.end()]);
	}
});
test("future maintenance changes recalculate eligible slots and preserve historical windows", async () => {
	const c = await testClient("migrator");
	try {
		await c.query("BEGIN");
		const service = (
				await c.query(
					"SELECT id FROM services WHERE name='Schema upgrade sentinel'",
				)
			).rows[0].id,
			endpoint = (
				await c.query("SELECT id FROM endpoints WHERE service_id=$1", [service])
			).rows[0].id;
		const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
			starts = day + "T00:00:00Z",
			ends = day + "T00:30:00Z";
		await c.query("UPDATE endpoints SET enabled_windows=$2 WHERE id=$1", [
			endpoint,
			JSON.stringify([{ start: starts, end: null, required: true }]),
		]);
		const w = (
			await c.query(
				"INSERT INTO maintenance_windows(service_id,environment,starts_at,ends_at,approval_reference) VALUES($1,'staging',$2,$3,'test') RETURNING id",
				[service, starts, ends],
			)
		).rows[0].id;
		const samples = async () =>
			(
				await c.query("SELECT samples FROM monitor_samples($1,$2,$2)", [
					endpoint,
					day,
				])
			).rows[0].samples;
		expect((await samples()).slice(0, 3)).toBe("MMU");
		await c.query("SAVEPOINT overlap");
		await expect(
			c.query(
				"INSERT INTO maintenance_windows(service_id,environment,starts_at,ends_at,approval_reference) VALUES($1,'staging',$2,$3,'conflict')",
				[service, starts, ends],
			),
		).rejects.toMatchObject({ code: "23P01" });
		await c.query("ROLLBACK TO SAVEPOINT overlap");
		await c.query(
			"UPDATE maintenance_windows SET ends_at=starts_at+interval '15 minutes' WHERE id=$1",
			[w],
		);
		expect((await samples()).slice(0, 3)).toBe("MUU");
		await c.query(
			"UPDATE maintenance_windows SET cancelled_at=now() WHERE id=$1",
			[w],
		);
		expect((await samples()).slice(0, 3)).toBe("UUU");
	} finally {
		await c.query("ROLLBACK");
		await c.end();
	}
});
test("period report weights retained and raw samples and never counts unknown or maintenance as successful", async () => {
	const c = await testClient("migrator");
	try {
		await c.query("BEGIN");
		const { buildReport } = await import("../../apps/web/lib/reports");
		const day = 86400000,
			start = new Date((Math.floor(Date.now() / day) - 40) * day),
			end = new Date(+start + 2 * day);
		const service = (
				await c.query(
					"SELECT id FROM services WHERE name='Schema upgrade sentinel'",
				)
			).rows[0].id,
			endpoint = (
				await c.query("SELECT id FROM endpoints WHERE service_id=$1", [service])
			).rows[0].id;
		await c.query("UPDATE endpoints SET enabled_windows=$2 WHERE id=$1", [
			endpoint,
			JSON.stringify([
				{ start: start.toISOString(), end: null, required: true },
			]),
		]);
		for (const [i, prefix] of ["SFFF", "SUM"].entries())
			await c.query(
				"INSERT INTO daily_summaries(endpoint_id,environment,day,samples) VALUES($1,'staging',$2,$3)",
				[
					endpoint,
					new Date(+start + i * day).toISOString().slice(0, 10),
					prefix.padEnd(96, "N"),
				],
			);
		await c.query(
			"INSERT INTO metric_daily SELECT service_id,environment,provider,resource_id,metric_name,source_method,$1::date,3,90,20,40 FROM metric_snapshots WHERE source_reference='restore-proof'",
			[start.toISOString()],
		);
		await c.query(
			"UPDATE metric_snapshots SET observed_at=$1,value=10 WHERE source_reference='restore-proof'",
			[start],
		);
		// A late staff entry must not erase an incident from a previously open period.
		const actor = (
			await c.query("SELECT id FROM users WHERE subject='upgrade-proof'")
		).rows[0].id;
		const created = new Date(+start - day),
			reported = new Date(+start - 60000),
			recorded = new Date(+start + day);
		const late = (
			await c.query(
				"INSERT INTO incidents(service_id,environment,title,severity,owner_name,created_by,created_at,status,resolved_at,version) VALUES($1,'staging','Late resolution fixture','low','Test',$2,$3,'resolved',$4,2) RETURNING id",
				[service, actor, created, reported],
			)
		).rows[0].id;
		await c.query(
			"INSERT INTO incident_updates(incident_id,version,actor,occurred_at,recorded_at,status,message) VALUES($1,1,$2,$3,$3,'investigating','Checking'),($1,2,$2,$4,$5,'resolved','Reported later')",
			[late, actor, created, reported, recorded],
		);
		const report = await buildReport(
			c as unknown as import("pg").PoolClient,
			"staging",
			{ kind: "weekly", start, end },
		);
		expect(
			report.records.find((r) => r.measure === "Late resolution fixture"),
		).toMatchObject({
			value: "resolved",
			coverage: expect.stringContaining(recorded.toISOString()),
		});
		const earlier = await buildReport(
			c as unknown as import("pg").PoolClient,
			"staging",
			{ kind: "daily", start, end: recorded },
		);
		expect(
			earlier.records.find((r) => r.measure === "Late resolution fixture"),
		).toMatchObject({ value: "investigating" });
		const application = report.records.find(
			(r) =>
				r.service === "Schema upgrade sentinel" && r.category === "Application",
		);
		expect(application).toMatchObject({
			value: "40",
			coverage: "2 successful, 3 failed, 1 unknown, 1 excluded",
		});
		expect(
			report.records.find(
				(r) =>
					r.service === "Schema upgrade sentinel" &&
					r.category === "Infrastructure",
			),
		).toMatchObject({ value: "25", coverage: "4 samples · min 10 · max 40" });
	} finally {
		await c.query("ROLLBACK");
		await c.end();
	}
});

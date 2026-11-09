import { test, expect } from "vitest";
import { testClient } from "../support/approved-db.mjs";
import { dictionary } from "../../infrastructure/metrics";
test("metric privileges, canonical units, correction rollback and exact-once daily retention", async () => {
	const c = await testClient("migrator");
	try {
		const defs = await c.query("SELECT * FROM metric_definitions");
		expect(
			Object.fromEntries(
				defs.rows.map((r) => [r.name, [r.unit, r.aggregation]]),
			),
		).toEqual(dictionary);
		for (const [role, table, expected] of [
			["web", "provider_readings", false],
			["web", "metric_snapshots", false],
			["web", "manual_readings", true],
			["collector", "manual_readings", false],
			["collector", "provider_readings", true],
		]) {
			expect(
				(
					await c.query(
						"SELECT has_column_privilege($1,$2,'value','INSERT') AS allowed",
						["kbean_test_" + role, table],
					)
				).rows[0].allowed,
			).toBe(expected);
		}
		await c.query("BEGIN");
		const actor = (
			await c.query("SELECT id FROM users WHERE subject='upgrade-proof'")
		).rows[0].id;
		const service = (
			await c.query(
				"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('development','Retention fixture','test','test','normal','fixture') RETURNING id",
			)
		).rows[0].id;
		const batch = (
			await c.query(
				"INSERT INTO import_batches(actor,environment,digest) VALUES($1,'development',repeat('a',64)) RETURNING id",
				[actor],
			)
		).rows[0].id;
		const insert = `INSERT INTO manual_readings(service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_method,source_reference,note,entered_by,batch_id,supersedes_id,correction_reason)
 VALUES($1,'development','azure','normalized_ru','percent','max',$2,current_date-31,'manual','fixture','fixture',$3,$4,$5,$6) RETURNING id`;
		const original = (
			await c.query(insert, [service, 2, actor, batch, null, null])
		).rows[0].id;
		await c.query("SAVEPOINT bad");
		await expect(
			c.query(insert, [service, 101, actor, batch, original, "invalid"]),
		).rejects.toMatchObject({ code: "23514" });
		await c.query("ROLLBACK TO bad");
		expect(
			(
				await c.query(
					"SELECT current_value FROM metric_snapshots WHERE id=$1",
					[original],
				)
			).rows[0].current_value,
		).toBe(true);
		await c.query(insert, [
			service,
			0,
			actor,
			batch,
			original,
			"reviewed correction",
		]);
		await c.query("SELECT retain_metrics()");
		await c.query("SELECT retain_metrics()");
		expect(
			(
				await c.query(
					"SELECT total::int,sample_count::int FROM metric_daily WHERE service_id=$1",
					[service],
				)
			).rows,
		).toEqual([{ total: 0, sample_count: 1 }]);
		expect(
			(
				await c.query("SELECT id FROM metric_snapshots WHERE service_id=$1", [
					service,
				])
			).rows,
		).toHaveLength(0);
	} finally {
		await c.query("ROLLBACK");
		await c.end();
	}
});
test("independent exact resources and concurrent budget reservations stay scoped", async () => {
	const c = await testClient("migrator"),
		first = await testClient("collector"),
		second = await testClient("collector");
	try {
		const sid = (
			await c.query(
				"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('staging','Budget fixture','Test','Synthetic','normal','test') RETURNING id",
			)
		).rows[0].id;
		const sql =
			"INSERT INTO integrations(service_id,environment,provider,name,resource_type,identifier,enabled,cost_status,expires_at,review) VALUES($1,$2,'digitalocean','Budget','droplet','123',true,'verified_no_incremental_cost',now()+interval '1 hour',$3) RETURNING id";
		const review = JSON.stringify({ dailyRequests: 1, dailySeries: 2 });
		await expect(
			c.query(sql, [sid, "production", review]),
		).rejects.toMatchObject({ code: "23503" });
		const id = (await c.query(sql, [sid, "staging", review])).rows[0].id;
		await c.query("INSERT INTO resource_capabilities VALUES($1,'load_1')", [
			id,
		]);
		const reserve = "SELECT reserve_metric_request($1,$2,$3) AS ok";
		expect((await first.query(reserve, [id, "app_cpu", 1])).rows[0].ok).toBe(
			false,
		);
		const results = await Promise.all([
			first.query(reserve, [id, "load_1", 2]),
			second.query(reserve, [id, "load_1", 2]),
		]);
		expect(results.map((r) => r.rows[0].ok).sort()).toEqual([false, true]);
		expect(
			(
				await c.query(
					"SELECT requests,series FROM metric_request_budget WHERE resource_id=$1",
					[id],
				)
			).rows,
		).toEqual([{ requests: 1, series: 2 }]);
	} finally {
		await Promise.all([c.end(), first.end(), second.end()]);
	}
});

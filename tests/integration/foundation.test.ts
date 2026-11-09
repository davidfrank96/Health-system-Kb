import { expect, test } from "vitest";
import { testClient } from "../support/approved-db.mjs";
test("migrations are current and web cannot administer identities or bypass inventory constraints", async () => {
	const c = await testClient("migrator");
	try {
		expect(
			(await c.query("SELECT version FROM schema_migrations ORDER BY version"))
				.rows,
		).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }, { version: 4 }]);
		for (const name of [
			"users",
			"memberships",
			"schema_migrations",
			"endpoints",
			"audit_events",
		]) {
			expect(
				(
					await c.query(
						"SELECT has_table_privilege('kbean_test_web',$1,'UPDATE') AS permitted",
						[name],
					)
				).rows[0].permitted,
			).toBe(false);
		}
		await c.query("BEGIN");
		const name = `fixture-${crypto.randomUUID()}`;
		const { rows } = await c.query(
			"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES ('development',$1,'Fixture','Fixture','normal','fixture') RETURNING id",
			[name],
		);
		for (const [sql, params, code] of [
			[
				"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES ('development',upper($1),'Fixture','Fixture','normal','fixture')",
				[name],
				"23505",
			],
			[
				"INSERT INTO endpoints(service_id,environment,url) VALUES ($1,'staging','https://fixture.invalid')",
				[rows[0].id],
				"23503",
			],
			[
				"INSERT INTO endpoints(service_id,environment,url,enabled) VALUES ($1,'development','https://fixture.invalid',true)",
				[rows[0].id],
				"23514",
			],
		] as const) {
			await c.query("SAVEPOINT negative_case");
			await expect(c.query(sql, [...params])).rejects.toMatchObject({ code });
			await c.query("ROLLBACK TO SAVEPOINT negative_case");
		}
	} finally {
		await c.query("ROLLBACK");
		await c.end();
	}
});

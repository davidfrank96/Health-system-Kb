import { expect, test } from "vitest";
import { testClient } from "../support/approved-db.mjs";

test("native test connection uses PostgreSQL 18, the isolated database and a restricted role", async () => {
	const c = await testClient();
	try {
		const { rows } = await c.query(
			"SELECT current_database() AS db,current_user AS identity",
		);
		expect(rows[0]).toEqual({ db: "kbean_test", identity: "kbean_test_web" });
	} finally {
		await c.end();
	}
});

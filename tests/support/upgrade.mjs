import { testClient } from "./approved-db.mjs";
const client = await testClient("migrator");
try {
	if (process.argv[2] === "seed") {
		await client.query(
			"INSERT INTO users(issuer,subject,email) VALUES('fixture','upgrade-proof','upgrade@example.invalid')",
		);
	} else {
		const { rows } = await client.query(
			"SELECT count(*)::int AS count FROM users WHERE issuer='fixture' AND subject='upgrade-proof'",
		);
		if (rows[0].count !== 1)
			throw new Error("Upgrade failed to preserve identity");
		console.log(
			"Populated v1 database upgraded to v3 and replayed successfully.",
		);
	}
} finally {
	await client.end();
}

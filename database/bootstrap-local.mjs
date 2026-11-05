// Called only by the project-owned local/CI launcher, with isolated bootstrap credentials.
import pg from "pg";
import { connectionOptions, checkVersion } from "./connection.mjs";
const web = connectionOptions(process.env),
	migrator = connectionOptions(process.env, "migrator");
const admin = new pg.Client({
	...web,
	user: "fixture_owner",
	database: "postgres",
	password: process.env.KBEAN_BOOTSTRAP_PASSWORD,
});
try {
	await admin.connect();
	await checkVersion(admin);
	const existing = await admin.query(
		"SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=$1",
		[web.database],
	);
	if (existing.rowCount) {
		if (
			process.env.KBEAN_DB_TIER !== "development" ||
			existing.rows[0].owner !== migrator.user
		)
			throw new Error(
				"Refusing to reuse an existing test database or unexpected development owner.",
			);
	} else {
		for (const role of [web, migrator]) {
			const { rows } = await admin.query(
				"SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',$1::text,$2::text) AS ddl",
				[role.user, role.password],
			);
			await admin.query(rows[0].ddl);
		}
		// These identifiers can only be one of the fixed names validated by connectionOptions.
		await admin.query(`CREATE DATABASE ${web.database} OWNER ${migrator.user}`);
		await admin.query(
			`REVOKE CONNECT, TEMPORARY ON DATABASE ${web.database} FROM PUBLIC`,
		);
		await admin.query(
			`GRANT CONNECT ON DATABASE ${web.database} TO ${web.user}`,
		);
	}
} finally {
	await admin.end();
}

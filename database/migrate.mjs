import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import pg from "pg";
import {
	connectionOptions,
	checkVersion,
	requireApprovedTest,
} from "./connection.mjs";
if (process.env.KBEAN_MIGRATION_APPROVED !== "yes")
	throw new Error("Set explicit approval for this development/test migration.");
const v1Only = process.argv[2] === "--test-v1";
const v3Only = process.argv[2] === "--test-v3";
const v4Only = process.argv[2] === "--test-v4";
if (v1Only || v3Only || v4Only) requireApprovedTest(process.env);
const client = new pg.Client(connectionOptions(process.env, "migrator"));
try {
	await client.connect();
	await checkVersion(client);
	await client.query("BEGIN");
	await client.query("SET LOCAL search_path TO public");
	await client.query("SELECT pg_advisory_xact_lock(1262634318,1)");
	await client.query(
		"CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, digest char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
	);
	for (const [index, file] of [
		"001_identity.sql",
		"002_inventory.sql",
		"003_monitoring.sql",
		"004_infrastructure.sql",
		"005_operations.sql",
	].entries()) {
		const sql = await readFile(
				new URL(`./migrations/${file}`, import.meta.url),
				"utf8",
			),
			version = index + 1;
		if (
			(v4Only && version > 4) ||
			(v1Only && version > 1) ||
			(v3Only && version > 3)
		)
			break;
		const digest = createHash("sha256").update(sql).digest("hex");
		const previous = await client.query(
			"SELECT digest FROM schema_migrations WHERE version=$1",
			[version],
		);
		if (previous.rowCount && previous.rows[0].digest !== digest)
			throw new Error(`Applied migration changed: ${version}`);
		if (previous.rowCount) continue;
		await client.query(sql);
		await client.query(
			"INSERT INTO schema_migrations(version,digest) VALUES($1,$2)",
			[version, digest],
		);
	}
	await client.query("COMMIT");
	console.log("Development/test migrations are current.");
} finally {
	await client.end();
}

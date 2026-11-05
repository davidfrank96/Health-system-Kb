// Phase 01 can reach a private Unix socket or literal loopback, never a cloud target.
import { isAbsolute } from "node:path";
export const postgresMajor = 18;
export function connectionOptions(env, purpose = "web") {
	const tier = env.KBEAN_DB_TIER,
		host = env.KBEAN_DB_HOST ?? "";
	if (
		!["development", "test"].includes(tier) ||
		!["web", "migrator"].includes(purpose)
	)
		throw new Error("Invalid local database tier or identity.");
	if (
		!(isAbsolute(host) || host === "127.0.0.1" || host === "::1") ||
		host.includes(",")
	)
		throw new Error("Phase 01 requires a local database connection.");
	const database = env.KBEAN_DB_NAME,
		user = env[purpose === "web" ? "KBEAN_DB_USER" : "KBEAN_MIGRATION_USER"],
		password =
			env[purpose === "web" ? "KBEAN_DB_PASSWORD" : "KBEAN_MIGRATION_PASSWORD"];
	const port = Number(env.KBEAN_DB_PORT ?? 5432);
	if (
		database !== `kbean_${tier}` ||
		user !== `kbean_${tier}_${purpose}` ||
		!password ||
		!Number.isInteger(port) ||
		port < 1 ||
		port > 65535
	)
		throw new Error("Incomplete or inconsistent local database settings.");
	return {
		host,
		port,
		database,
		user,
		password,
		ssl: false,
		options: "-c search_path=public",
		connectionTimeoutMillis: 4000,
		statement_timeout: 5000,
		application_name: `kbean-${tier}-${purpose}`,
	};
}
export function requireApprovedTest(env) {
	if (
		env.KBEAN_DB_TIER !== "test" ||
		env.KBEAN_TEST_APPROVED !== "yes" ||
		env.KBEAN_DB_NAME !== "kbean_test"
	)
		throw new Error("Tests require the isolated kbean_test database.");
}
export async function checkVersion(client) {
	const { rows } = await client.query("SHOW server_version_num");
	if (Math.floor(Number(rows[0].server_version_num) / 10000) !== postgresMajor)
		throw new Error("The local and CI server must run PostgreSQL major 18.");
}

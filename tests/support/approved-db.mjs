import pg from "pg";
import {
	connectionOptions,
	requireApprovedTest,
	checkVersion,
} from "../../database/connection.mjs";
export async function testClient(purpose = "web") {
	requireApprovedTest(process.env);
	const options = connectionOptions(process.env, purpose);
	const client = new pg.Client(options);
	try {
		await client.connect();
		await checkVersion(client);
		const { rows } =
			await client.query(`SELECT current_user AS identity,current_database() AS database,
      rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user`);
		const row = rows[0];
		if (
			!row ||
			row.identity !== options.user ||
			row.database !== options.database ||
			row.rolsuper ||
			row.rolcreatedb ||
			row.rolcreaterole
		)
			throw new Error("Approved test database identity check failed.");
		return client;
	} catch (e) {
		await client.end();
		throw e;
	}
}

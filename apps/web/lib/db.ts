import { connectionOptions } from "../../../database/connection.mjs";
import { Pool, type PoolClient } from "pg";

const shared = globalThis as typeof globalThis & { kbeanPool?: Pool };
export function db() {
	if (!shared.kbeanPool) {
		shared.kbeanPool = new Pool({ ...connectionOptions(process.env), max: 5 });
		shared.kbeanPool.on("error", () =>
			console.error("Idle database connection closed."),
		);
	}
	return shared.kbeanPool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
	const client = await db().connect();
	try {
		await client.query("BEGIN");
		const result = await work(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

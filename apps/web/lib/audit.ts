import type { PoolClient } from "pg";
import { contentDigest } from "../../../infrastructure/imports";
import { HttpError, type Environment } from "./security";
export async function audited(
	c: PoolClient,
	actor: string,
	env: Environment,
	action: string,
	key: string,
	identity: unknown,
	work: () => Promise<unknown>,
) {
	const digest = contentDigest(identity);
	await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
		[actor, action, key].join("/"),
	]);
	const previous = (
		await c.query(
			"SELECT digest,result FROM audit_events WHERE actor=$1 AND action=$2 AND request_key=$3",
			[actor, action, key],
		)
	).rows[0];
	if (previous) {
		if (previous.digest !== digest) throw new HttpError(409, "key_conflict");
		return previous.result;
	}
	const result = await work();
	await c.query(
		"INSERT INTO audit_events(actor,environment,action,request_key,digest,result) VALUES($1,$2,$3,$4,$5,$6)",
		[actor, env, action, key, digest, JSON.stringify(result)],
	);
	return result;
}

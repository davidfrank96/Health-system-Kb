import type { PoolClient } from "pg";
import { z } from "zod";
import {
	digest,
	environment,
	equal,
	HttpError,
	mac,
	roleFor,
	type Environment,
	type Staff,
} from "./security";

const label = z.string().trim().min(1).max(120);
export const serviceInput = z.strictObject({
	name: label,
	product: label,
	environment,
	owner: label,
	criticality: z.enum(["critical", "high", "normal", "low"]),
	evidenceReference: z.string().trim().min(1).max(500),
});
export type ServiceInput = z.infer<typeof serviceInput>;
export interface Service extends ServiceInput {
	id: string;
	version: number;
	verification: "unverified";
	condition: "unknown";
}
type Row = ServiceInput & { id: string; version: number };
const fields =
	'id,environment,name,product,owner,criticality,evidence_reference AS "evidenceReference",version';
function present(row: Row) {
	return {
		...row,
		verification: "unverified",
		condition: "unknown",
		freshness: {
			quality: "missing",
			observedAt: null,
			collectedAt: null,
			ageSeconds: null,
			staleAfterSeconds: 2100,
		},
	} as const;
}
function cursor(id: string, env: Environment, actor: string) {
	return `${id}.${mac("cursor", [id, env, actor].join("/"))}`;
}
export async function listServices(
	c: PoolClient,
	staff: Staff,
	env: Environment,
	limit: number,
	after: string | null,
) {
	roleFor(staff, env);
	let id: string | null = null;
	if (after !== null) {
		id = after.split(".")[0];
		if (
			!z.uuid().safeParse(id).success ||
			!equal(after, cursor(id, env, staff.id))
		)
			throw new HttpError(400, "invalid_cursor");
	}
	const rows = await c.query<Row>(
		`SELECT ${fields} FROM services WHERE environment=$1 AND ($2::uuid IS NULL OR id>$2) ORDER BY id LIMIT $3`,
		[env, id, limit + 1],
	);
	const items = rows.rows.slice(0, limit).map(present);
	return {
		items,
		nextCursor:
			rows.rows.length > limit
				? cursor(items[limit - 1].id, env, staff.id)
				: null,
	};
}
export async function getService(c: PoolClient, staff: Staff, id: string) {
	const result = await c.query<Row>(
		`SELECT ${fields} FROM services WHERE id=$1 AND environment=ANY($2::environment_name[])`,
		[id, staff.memberships.map((m) => m.environment)],
	);
	if (!result.rows[0]) throw new HttpError(404, "service_not_found");
	return present(result.rows[0]);
}
export async function saveService(
	c: PoolClient,
	staff: Staff,
	body: ServiceInput,
	key: string,
	id: string | null,
	revision: string | null,
) {
	if (id) {
		const existing = await getService(c, staff, id);
		if (existing.environment !== body.environment)
			throw new HttpError(403, "environment_immutable");
	}
	if (roleFor(staff, body.environment) !== "admin")
		throw new HttpError(403, "admin_required");
	const action = id ? `service.update.${id}` : "service.create";
	const fingerprint = digest(JSON.stringify([body, revision]));
	await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
		[staff.id, action, key].join("/"),
	]);
	const previous = await c.query(
		"SELECT digest,result FROM audit_events WHERE actor=$1 AND action=$2 AND request_key=$3",
		[staff.id, action, key],
	);
	if (previous.rows[0]) {
		if (previous.rows[0].digest !== fingerprint)
			throw new HttpError(409, "key_conflict");
		return previous.rows[0].result as ReturnType<typeof present>;
	}
	const values = [
		body.environment,
		body.name,
		body.product,
		body.owner,
		body.criticality,
		body.evidenceReference,
	];
	const result = id
		? await c.query<Row>(
				`UPDATE services SET name=$2,product=$3,owner=$4,criticality=$5,evidence_reference=$6,version=version+1
       WHERE environment=$1 AND id=$7 AND version=$8 RETURNING ${fields}`,
				[...values, id, Number(revision?.slice(1, -1))],
			)
		: await c.query<Row>(
				`INSERT INTO services(environment,name,product,owner,criticality,evidence_reference)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING ${fields}`,
				values,
			);
	if (!result.rows[0]) throw new HttpError(409, "version_conflict");
	const service = present(result.rows[0]);
	await c.query(
		"INSERT INTO audit_events(actor,environment,action,target,request_key,digest,result) VALUES($1,$2,$3,$4,$5,$6,$7)",
		[staff.id, body.environment, action, service.id, key, fingerprint, service],
	);
	return service;
}

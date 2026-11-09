// Offline inventory registration accepts local reviewed resource metadata only.
import { readFile } from "node:fs/promises";
import pg from "pg";
import { z } from "zod";
import { connectionOptions } from "./connection.mjs";
const label = z.string().trim().min(1).max(80);
const schema = z.strictObject({
	name: label,
	serviceId: z.uuid(),
	environment: z.enum(["development", "production", "staging"]),
	provider: z.enum(["digitalocean", "azure", "firebase", "gcp", "other"]),
	resourceType: label,
	identifier: z.string().regex(/^[a-zA-Z0-9_./:-]{1,160}$/),
	region: label.optional(),
	component: label.max(63).optional(),
	instance: label.max(63).optional(),
	capabilities: z.array(z.string().max(60)).max(30),
});
const r = schema.parse(JSON.parse(await readFile(process.argv[2], "utf8")));
const c = new pg.Client(connectionOptions(process.env, "migrator"));
try {
	await c.connect();
	await c.query("BEGIN");
	const {
		rows: [resource],
	} = await c.query(
		`INSERT INTO integrations(service_id,environment,provider,name,resource_type,identifier,region,component,instance)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
		[
			r.serviceId,
			r.environment,
			r.provider,
			r.name,
			r.resourceType,
			r.identifier,
			r.region,
			r.component,
			r.instance,
		],
	);
	await c.query(
		"INSERT INTO resource_capabilities SELECT $1,unnest($2::text[])",
		[resource.id, r.capabilities],
	);
	await c.query(
		"INSERT INTO audit_events(environment,action,target) VALUES($1,'infrastructure.registered',$2)",
		[r.environment, resource.id],
	);
	await c.query("COMMIT");
	console.log("Registered disabled resource", resource.id);
} finally {
	await c.end();
}

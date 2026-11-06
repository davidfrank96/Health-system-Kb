// Offline operator command: migration credentials are never passed to the web process.
import pg from "pg";
import { z } from "zod";
import { connectionOptions } from "./connection.mjs";
import { canonicalTarget } from "../monitoring/probe.mjs";
if (process.env.KBEAN_MONITOR_CONFIG_APPROVED !== "yes")
	throw new Error("Explicit local configuration approval required.");
const [action, id, ...args] = process.argv.slice(2);
z.uuid().parse(id);
const c = new pg.Client(connectionOptions(process.env, "migrator"));
try {
	await c.connect();
	await c.query("BEGIN");
	if (action === "approve") {
		const url = canonicalTarget(args[0]),
			reference = z.string().trim().min(1).max(500).parse(args[1]);
		const result = await c.query(
			"UPDATE endpoints SET approved_url=$2,approval_reference=$3,approved_at=now(),version=version+1 WHERE id=$1 AND url=$2 RETURNING environment",
			[id, url, reference],
		);
		if (!result.rowCount) throw new Error("Exact target not found.");
		await c.query(
			"INSERT INTO audit_events(environment,action,target) VALUES($1,'endpoint.owner-approved',$2)",
			[result.rows[0].environment, id],
		);
	} else if (action === "maintenance") {
		const start = z.iso.datetime().parse(args[0]),
			end = z.iso.datetime().parse(args[1]),
			reference = z.string().trim().min(1).max(500).parse(args[2]);
		if (
			Date.parse(start) < Date.now() ||
			Date.parse(end) <= Date.parse(start) ||
			Date.parse(end) - Date.parse(start) > 30 * 86400000
		)
			throw new Error("Maintenance must be a bounded future interval.");
		const result = await c.query(
			"INSERT INTO maintenance_windows(service_id,environment,starts_at,ends_at,approval_reference) SELECT id,environment,$2,$3,$4 FROM services WHERE id=$1 RETURNING environment",
			[id, start, end, reference],
		);
		if (!result.rowCount) throw new Error("Service not found.");
		await c.query(
			"INSERT INTO audit_events(environment,action,target) VALUES($1,'maintenance.owner-approved',$2)",
			[result.rows[0].environment, id],
		);
	} else throw new Error("Expected approve or maintenance.");
	await c.query("COMMIT");
	console.log(
		"Local monitoring configuration recorded. Live collection remains disabled.",
	);
} finally {
	await c.end();
}

import pg from "pg";
import { z } from "zod";
import { connectionOptions } from "./connection.mjs";
export async function approveStaff(client, identity) {
	const { issuer, subject, email, environment, role } = z
		.strictObject({
			issuer: z.url(),
			subject: z.string().min(1).max(255),
			email: z.email().max(254),
			environment: z.enum(["development", "staging", "production"]),
			role: z.enum(["viewer", "operator", "admin"]),
		})
		.parse(identity);
	await client.query("BEGIN");
	try {
		const { rows } = await client.query(
			`INSERT INTO users(issuer,subject,email) VALUES($1,$2,$3) ON CONFLICT(issuer,subject)
      DO UPDATE SET email=excluded.email RETURNING id`,
			[issuer, subject, email],
		);
		const id = rows[0].id;
		await client.query(
			`INSERT INTO memberships(user_id,environment,role) VALUES($1,$2,$3) ON CONFLICT(user_id,environment)
      DO UPDATE SET role=excluded.role WHERE memberships.role<>excluded.role`,
			[id, environment, role],
		);
		await client.query(
			"INSERT INTO audit_events(environment,action,target) VALUES($1,'owner.membership.approved',$2)",
			[environment, id],
		);
		await client.query("COMMIT");
		return id;
	} catch (e) {
		await client.query("ROLLBACK");
		throw e;
	}
}
if (import.meta.filename === process.argv[1]) {
	const [subject, email, environment, role] = process.argv.slice(2);
	const client = new pg.Client(connectionOptions(process.env, "migrator"));
	try {
		await client.connect();
		await approveStaff(client, {
			issuer: "https://accounts.google.com",
			subject,
			email,
			environment,
			role,
		});
		console.log("Staff approval recorded.");
	} finally {
		await client.end();
	}
}

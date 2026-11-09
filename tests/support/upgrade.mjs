import { testClient } from "./approved-db.mjs";
const client = await testClient("migrator");
try {
	if (process.argv[2] === "seed") {
		await client.query(
			"INSERT INTO users(issuer,subject,email) VALUES('fixture','upgrade-proof','upgrade@example.invalid')",
		);
	} else if (process.argv[2] === "seed-v3") {
		await client.query(`WITH s AS (INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('staging','Schema upgrade sentinel','Fixture','Fixture','normal','fixture') RETURNING id,environment)
 INSERT INTO endpoints(service_id,environment,url) SELECT id,environment,'https://upgrade.example.invalid/health' FROM s`);
	} else {
		if (
			(
				await client.query(
					"SELECT id FROM endpoints WHERE environment='staging' AND url='https://upgrade.example.invalid/health'",
				)
			).rowCount !== 1
		)
			throw Error("Phase 02 endpoint lost during upgrade");
		const { rows } = await client.query(
			"SELECT count(*)::int AS count FROM users WHERE issuer='fixture' AND subject='upgrade-proof'",
		);
		if (rows[0].count !== 1)
			throw new Error("Upgrade failed to preserve identity");
		// Prove the new timeline survives a dump together with Phase 01–03 evidence.
		await client.query(`WITH added AS (
		 INSERT INTO incidents(service_id,environment,title,severity,owner_name,created_by)
		 SELECT s.id,s.environment,'Restore sentinel','low','Synthetic test',u.id FROM services s,users u
		 WHERE s.name='Schema upgrade sentinel' AND u.subject='upgrade-proof'
		 RETURNING id,created_by,created_at)
		 INSERT INTO incident_updates(incident_id,version,actor,occurred_at,status,message)
		 SELECT id,1,created_by,created_at,'investigating','Synthetic restore marker' FROM added`);
		console.log(
			"Populated v1 database upgraded through v3 and v4 to v5 and replayed successfully.",
		);
	}
} finally {
	await client.end();
}

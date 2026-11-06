import { createServer } from "node:http";
import { fixtureAuthority } from "../../monitoring/probe.mjs";
import { runFixtures } from "../../monitoring/runner.mjs";
import { slotOf, SLOT } from "../../monitoring/model.mjs";
import { requireApprovedTest } from "../../database/connection.mjs";
export async function monitoringFixture(owner, offset = 20) {
	requireApprovedTest(process.env);
	let recovering = false;
	const server = createServer((req, res) => {
		const status =
			req.url === "/down"
				? 404
				: req.url === "/recovery" && !recovering
					? 500
					: 200;
		res.writeHead(status);
		res.end();
	});
	await new Promise((r) => server.listen(0, "127.0.0.1", r));
	const origin = `http://127.0.0.1:${server.address().port}`;
	const records = [];
	try {
		for (const [name, path, enabled] of [
			["Fixture Healthy", "/healthy", true],
			["Fixture Down", "/down", true],
			["Fixture Recovered", "/recovery", true],
			["Fixture Unknown", "/unknown", false],
			["Fixture Stale", "/stale", true],
		]) {
			const service = (
				await owner.query(
					"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('development',$1,'Controlled local fixture','Test runner','normal','Phase02 local fixture') RETURNING id",
					[name],
				)
			).rows[0];
			const url = origin + path;
			const endpoint = (
				await owner.query(
					"INSERT INTO endpoints(service_id,environment,url,approved_url,approval_reference,approved_at,enabled) VALUES($1,'development',$2,$2,'Controlled local fixture',now(),$3) RETURNING id",
					[service.id, url, enabled],
				)
			).rows[0];
			records.push({
				name,
				serviceId: service.id,
				id: endpoint.id,
				url,
				enabled,
			});
		}
		const start = slotOf(Date.now()) - offset * SLOT;
		await owner.query(
			"UPDATE endpoints SET enabled_windows=$2 WHERE id=ANY($1::uuid[])",
			[
				records.filter((r) => r.enabled).map((r) => r.id),
				JSON.stringify([{ start: new Date(start).toISOString(), end: null }]),
			],
		);
		const authority = fixtureAuthority(
			process.env,
			records.map((r) => r.url),
		);
		const runs = [];
		for (let i = 0; i < 4; i++) {
			recovering = i >= 2;
			const run = await runFixtures(process.env, authority, {
				slot: new Date(start + i * SLOT),
			});
			if (run.status !== "completed")
				throw new Error("Fixture collection failed");
			runs.push(run);
		}
		const stale = records.find((r) => r.name === "Fixture Stale");
		// Explicit stale-presentation fixture; execution scenarios above use real HTTP responses.
		await owner.query(
			"UPDATE endpoints SET state=jsonb_set(state,'{lastObserved}',to_jsonb((now()-interval '1 hour')::text)) WHERE id=$1",
			[stale.id],
		);
		return { records, runs };
	} finally {
		server.closeAllConnections();
		await new Promise((r) => server.close(r));
	}
}

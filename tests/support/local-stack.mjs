import { infrastructureFixture } from "./infra-fixture.mjs";
import pg from "pg";
import { connectionOptions, checkVersion } from "../../database/connection.mjs";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { testClient } from "./approved-db.mjs";
import { approveStaff } from "../../database/approve-staff.mjs";
import { startIssuer } from "./issuer.mjs";

import { monitoringFixture } from "./monitoring-fixture.mjs";
const interactive = process.argv[2] === "local";
const owner = interactive
	? new pg.Client(connectionOptions(process.env, "migrator"))
	: await testClient("migrator");
if (interactive) {
	await owner.connect();
	await checkVersion(owner);
}
if (!interactive) {
	await monitoringFixture(owner);
	await infrastructureFixture(owner);
}
const fixtureService = interactive
	? null
	: (
			await owner.query(
				"SELECT id FROM services WHERE name='Fixture infrastructure' AND environment='development'",
			)
		).rows[0].id;
const fixtureSecret = randomBytes(32).toString("hex"),
	previousSecret = randomBytes(32).toString("hex");
const fixtureQA = interactive
	? {}
	: {
			KBEAN_QA_EVIDENCE_HOSTS: "qa.example.invalid",
			KBEAN_QA_CADENCES: JSON.stringify({
				[JSON.stringify(["development", fixtureService, "Checkout smoke"])]: 60,
			}),
			KBEAN_QA_FIXTURE_CONFIG: JSON.stringify({
				source: "synthetic-qa",
				environment: "development",
				serviceIds: [fixtureService],
				keys: [
					["current", fixtureSecret],
					["previous", previousSecret],
				].map(([id, secret]) => ({
					id,
					secret,
					from: new Date(Date.now() - 10000).toISOString(),
					until: new Date(Date.now() + 3600000).toISOString(),
				})),
			}),
		};
const reservation = createServer();
reservation.listen(interactive ? 3000 : 0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const clientId = `kbean-${randomBytes(12).toString("hex")}`,
	clientSecret = randomBytes(32).toString("base64url");
const { issuer, close } = await startIssuer(origin, clientId, clientSecret);
const children = new Set();
const syntheticUsers = [];
let interrupted = false;
function run(binary, args, env) {
	const child = spawn(binary, args, { env, stdio: "inherit" });
	children.add(child);
	child.once("exit", () => children.delete(child));
	return child;
}
function stop() {
	interrupted = true;
	for (const child of children) child.kill("SIGTERM");
	close();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
try {
	for (const role of ["admin", "operator", "viewer"])
		syntheticUsers.push(
			await approveStaff(owner, {
				issuer,
				subject: `${clientId}/${role}`,
				email: `${role}@example.invalid`,
				role,
				environment: "development",
			}),
		);
	const webEnv = Object.fromEntries(
		Object.entries(process.env).filter(([key]) =>
			[
				"PATH",
				"KBEAN_DB_TIER",
				"KBEAN_DB_HOST",
				"KBEAN_DB_PORT",
				"KBEAN_DB_NAME",
				"KBEAN_DB_USER",
				"KBEAN_DB_PASSWORD",
			].includes(key),
		),
	);
	const web = run(
		"next",
		["start", "apps/web", "--hostname", "127.0.0.1", "--port", String(port)],
		{
			...webEnv,
			...fixtureQA,
			NODE_ENV: "production",
			APP_ORIGIN: origin,
			OIDC_ISSUER: issuer,
			OIDC_CLIENT_ID: clientId,
			OIDC_CLIENT_SECRET: clientSecret,
			KBEAN_LOCAL_FIXTURES: "1",
			SESSION_SECRET: randomBytes(32).toString("base64"),
			NEXT_TELEMETRY_DISABLED: "1",
		},
	);
	const stopped = once(web, "exit");
	let ready = false;
	for (let i = 0; i < 100 && web.exitCode === null && !interrupted; i++) {
		try {
			const res = await fetch(`${origin}/health/ready`);
			ready = res.ok && (await res.json()).status === "ok";
		} catch {}
		if (ready) break;
		await delay(100);
	}
	if (!ready) throw new Error("Local app did not become ready");
	if (interactive) {
		console.log(`Local development workspace: ${origin}`);
		await stopped;
	} else {
		const browser = run("playwright", ["test", ...process.argv.slice(3)], {
			...process.env,
			KBEAN_BROWSER_DB: "approved",
			KBEAN_TEST_QA_SECRET: fixtureSecret,
			KBEAN_TEST_QA_PREVIOUS: previousSecret,
			KBEAN_TEST_QA_SERVICE: fixtureService,
			KBEAN_TEST_ISSUER: issuer,
			KBEAN_TEST_SUBJECT: `${clientId}/operator`,
			KBEAN_TEST_ORIGIN: origin,
		});
		const [code] = await once(browser, "exit");
		process.exitCode = code ?? 1;
	}
} finally {
	stop();
	try {
		await owner.query(
			"UPDATE users SET disabled=true WHERE issuer=$1 AND id=ANY($2::uuid[])",
			[issuer, syntheticUsers],
		);
	} finally {
		await owner.end();
	}
}

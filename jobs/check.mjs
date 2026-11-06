// Finite entrypoint. Live collection cannot be enabled through an environment variable.
if (process.argv[2] !== "--fixtures") {
	console.log(JSON.stringify({ status: "disabled", probesAttempted: 0 }));
} else {
	const { requireApprovedTest } = await import("../database/connection.mjs");
	requireApprovedTest(process.env);
	const { testClient } = await import("../tests/support/approved-db.mjs");
	const { monitoringFixture } = await import(
		"../tests/support/monitoring-fixture.mjs"
	);
	const watchdog = setTimeout(() => process.exit(1), 300000);
	const c = await testClient("migrator");
	try {
		const result = await monitoringFixture(c, 4);
		console.log(
			JSON.stringify({
				status: "completed",
				source: "controlled-local-fixtures",
				runs: result.runs,
				services: result.records.map((r) => r.name),
			}),
		);
	} finally {
		clearTimeout(watchdog);
		await c.end();
	}
}

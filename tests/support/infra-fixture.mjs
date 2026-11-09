import { testClient } from "./approved-db.mjs";
import { collectResource } from "../../infrastructure/collector.mjs";
export async function infrastructureFixture(owner) {
	const {
		rows: [service],
	} = await owner.query(
		"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('development','Fixture infrastructure','Fixture','Fixture','normal','test') RETURNING id",
	);
	const review = {
		owner: "fixture",
		reviewedSource: "controlled response",
		permissionReviewed: true,
		allowanceEvidence: "isolated fixture budget",
		permissionEvidence: "synthetic read-only scopes",
		incrementalCost: 0,
		environment: "development",
		resourceId: "123",
		resourceType: "droplet",
		metrics: ["load_1"],
		maxSeries: 1,
		dailyRequests: 2,
		dailySeries: 2,
		scopes: [
			"monitoring:read",
			"droplet:read",
			"regions:read",
			"sizes:read",
			"actions:read",
			"image:read",
			"snapshot:read",
		],
	};
	const {
		rows: [r],
	} = await owner.query(
		`INSERT INTO integrations(service_id,environment,provider,name,resource_type,identifier,region,enabled,cost_status,review,expires_at)
 VALUES($1,'development','digitalocean','Synthetic web droplet','droplet','123','Fixture region',true,'verified_no_incremental_cost',$2,now()+interval '1 hour') RETURNING id`,
		[service.id, JSON.stringify(review)],
	);
	await owner.query("INSERT INTO resource_capabilities VALUES($1,'load_1')", [
		r.id,
	]);
	const collector = await testClient("collector");
	try {
		const state = await collectResource(collector, r.id, "load_1", {
			environment: "development",
			token: "synthetic",
			deadline: Date.now() + 5000,
			transport: async (url) => {
				const end = Number(url.searchParams.get("end"));
				return Response.json({
					status: "success",
					data: {
						resultType: "matrix",
						result: [
							{
								metric: { host_id: "123" },
								values: [
									[end - 600, "0.22"],
									[end - 300, "0.48"],
									[end, "0.35"],
								],
							},
						],
					},
				});
			},
		});
		if (state !== "fresh") throw Error("Fixture ingestion failed: " + state);
		await collector.query("SELECT retain_metrics()");
	} finally {
		await collector.end();
	}
	return service.id;
}

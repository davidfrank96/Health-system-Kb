import { collect } from "./digitalocean.mjs";
// Caller controls the finite deadline and supplies only the credential for this environment.
export async function collectResource(
	client,
	id,
	metric,
	{ environment, token, deadline, transport, signal },
) {
	const {
		rows: [r],
	} = await client.query(
		`SELECT i.*,d.unit,d.aggregation FROM integrations i JOIN resource_capabilities cap ON cap.resource_id=i.id JOIN metric_definitions d ON d.name=cap.metric_name WHERE i.id=$1 AND i.environment=$2 AND d.name=$3 AND i.provider='digitalocean'`,
		[id, environment, metric],
	);
	if (!r) return "unsupported";
	if (["permission_denied", "rate_limited"].includes(r.collection_state))
		return r.collection_state;
	const end = Math.floor(Date.now() / 1000),
		resource = {
			identifier: r.identifier,
			type: r.resource_type,
			environment,
			component: r.component ?? undefined,
			instance: r.instance ?? undefined,
		};
	const result = await collect({
		resource,
		metric,
		authority: {
			...r.review,
			provider: r.provider,
			enabled: r.enabled,
			costStatus: r.cost_status,
			expiresAt: r.expires_at,
		},
		credentialEnvironment: environment,
		token,
		start: end - 900,
		end,
		deadline,
		transport,
		signal,
		reserve: async (series) =>
			(
				await client.query(
					"SELECT reserve_metric_request($1,$2,$3) AS reserved",
					[id, metric, series],
				)
			).rows[0].reserved,
	});
	await client.query("BEGIN");
	try {
		for (const p of result.observations)
			await client.query(
				`INSERT INTO provider_readings(resource_id,service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_method,source_reference,note)
 SELECT $1,$2,$3,'digitalocean',$4,$5,$6,$7,to_timestamp($8),'provider_api','DigitalOcean Monitoring',''
 WHERE NOT EXISTS(SELECT FROM provider_readings WHERE resource_id=$1 AND metric_name=$4 AND observed_at=to_timestamp($8))`,
				[
					id,
					r.service_id,
					environment,
					metric,
					r.unit,
					r.aggregation,
					p.value,
					p.time,
				],
			);
		await client.query(
			"UPDATE integrations SET collection_state=$2,last_success=CASE WHEN $3 THEN now() ELSE last_success END WHERE id=$1",
			[id, result.state, result.observations.length > 0],
		);
		await client.query("COMMIT");
		return result.state;
	} catch (e) {
		await client.query("ROLLBACK");
		throw e;
	}
}

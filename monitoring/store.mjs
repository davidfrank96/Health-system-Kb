import { transition, SLOT, availability, sumAvailability } from "./model.mjs";
export async function storeCheck(c, endpoint, runId, slot, check) {
	const live = (
		await c.query("SELECT * FROM endpoints WHERE id=$1 FOR UPDATE", [
			endpoint.id,
		])
	).rows[0];
	if (!live?.enabled || live.version !== endpoint.version) return false;
	const maintenance =
		(
			await c.query(
				"SELECT 1 FROM maintenance_windows WHERE service_id=$1 AND environment=$2 AND starts_at<=$3 AND ends_at>$3 LIMIT 1",
				[live.service_id, live.environment, slot],
			)
		).rowCount > 0;
	const inserted = await c.query(
		`INSERT INTO health_checks(endpoint_id,environment,run_id,scheduled_slot,observed_at,collected_at,outcome,failure,http_status,latency_ms,attempts,configuration_version,maintenance)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(endpoint_id,scheduled_slot) DO NOTHING RETURNING endpoint_id`,
		[
			live.id,
			live.environment,
			runId,
			slot,
			check.observedAt,
			check.collectedAt ?? new Date(),
			check.outcome,
			check.failure,
			check.httpStatus,
			check.latencyMs,
			check.attempts,
			live.version,
			maintenance,
		],
	);
	if (!inserted.rowCount) return false;
	const { state, event } = transition(
		live.state,
		{ ...check, slot, maintenance },
		{
			failureThreshold: live.failure_threshold,
			recoveryThreshold: live.recovery_threshold,
			slowMs: live.slow_ms,
			clearMs: live.clear_ms,
		},
	);
	if (event === "opened")
		await c.query(
			`INSERT INTO downtime_events(endpoint_id,environment,first_failed_at,confirmed_at,first_failed_slot,confirmed_slot)
    VALUES($1,$2,$3,$4,$5,$6)`,
			[
				live.id,
				live.environment,
				state.firstFailure,
				check.observedAt,
				new Date(Number(new Date(slot)) - (state.failures - 1) * SLOT),
				slot,
			],
		);
	if (state.open || event === "resolved")
		await c.query(
			`UPDATE downtime_events SET evidence_gap=evidence_gap OR $2,first_recovery_at=$3,
    resolved_at=$4,recovery_slot=$5 WHERE endpoint_id=$1 AND resolved_at IS NULL`,
			[
				live.id,
				state.gap,
				state.firstRecovery,
				event === "resolved" ? check.observedAt : null,
				state.firstRecovery ? slot : null,
			],
		);
	await c.query("UPDATE endpoints SET state=$2,latest=$3 WHERE id=$1", [
		live.id,
		state,
		{ ...check, slot, maintenance },
	]);
	return true;
}
export async function retain(c, now = new Date()) {
	// Recompute recent complete days before removing evidence. Older summaries are immutable.
	const end = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
			86400000,
	);
	const start = new Date(+end - 30 * 86400000);
	const cutoff = new Date(+end - 28 * 86400000);
	await c.query(
		`INSERT INTO daily_summaries(endpoint_id,environment,day,samples,watermark)
    SELECT e.id,e.environment,s.day,s.samples,s.watermark FROM endpoints e
    CROSS JOIN LATERAL monitor_samples(e.id,$1::date,$2::date) s
    ON CONFLICT(endpoint_id,day) DO UPDATE SET samples=EXCLUDED.samples,watermark=EXCLUDED.watermark
    WHERE daily_summaries.day >= $3::date`,
		[
			start.toISOString().slice(0, 10),
			end.toISOString().slice(0, 10),
			cutoff.toISOString().slice(0, 10),
		],
	);

	// Resume safely after a long collector outage: summarize older retained raw days first.
	await c.query(
		`INSERT INTO daily_summaries(endpoint_id,environment,day,samples,watermark)
 SELECT b.endpoint_id,b.environment,s.day,s.samples,s.watermark FROM
 (SELECT DISTINCT h.endpoint_id,h.environment,(h.scheduled_slot AT TIME ZONE 'UTC')::date AS day
  FROM health_checks h LEFT JOIN daily_summaries d ON d.endpoint_id=h.endpoint_id AND d.day=(h.scheduled_slot AT TIME ZONE 'UTC')::date
  WHERE h.scheduled_slot<$1 AND d.endpoint_id IS NULL ORDER BY day LIMIT 100) b
 CROSS JOIN LATERAL monitor_samples(b.endpoint_id,b.day,b.day) s ON CONFLICT DO NOTHING`,
		[cutoff],
	);
	// At most one bounded 5000-row batch per invocation, only after a durable daily summary.
	await c.query(
		`DELETE FROM health_checks WHERE (endpoint_id,scheduled_slot) IN
    (SELECT h.endpoint_id,h.scheduled_slot FROM health_checks h JOIN daily_summaries d ON d.endpoint_id=h.endpoint_id AND d.day=(h.scheduled_slot AT TIME ZONE 'UTC')::date
     WHERE h.scheduled_slot<$1 ORDER BY h.scheduled_slot LIMIT 5000)`,
		[cutoff],
	);
	await c.query(
		`DELETE FROM daily_summaries WHERE (endpoint_id,day) IN (SELECT endpoint_id,day FROM daily_summaries WHERE day<($1::timestamptz-interval '12 months')::date LIMIT 1000)`,
		[now],
	);
	await c.query(
		`DELETE FROM collection_runs WHERE id IN (SELECT r.id FROM collection_runs r WHERE r.scheduled_slot<$1 AND NOT EXISTS(SELECT 1 FROM health_checks h WHERE h.run_id=r.id) LIMIT 1000)`,
		[new Date(+now - 30 * 86400000)],
	);
	await c.query(
		`DELETE FROM downtime_events WHERE id IN (SELECT id FROM downtime_events WHERE resolved_at<$1::timestamptz-interval '12 months' LIMIT 1000)`,
		[now],
	);
}
export function countSamples(samples) {
	const counts = {
		expected: 0,
		success: 0,
		failure: 0,
		unknown: 0,
		excluded: 0,
	};
	for (const s of samples) {
		if (s === "M") counts.excluded++;
		if ("SFU".includes(s)) counts.expected++;
		if (s === "S") counts.success++;
		if (s === "F") counts.failure++;
		if (s === "U") counts.unknown++;
	}
	return availability(counts);
}
export async function endpointHistory(
	c,
	endpointId,
	start,
	end,
	now = new Date(),
) {
	const first = new Date(start),
		last = new Date(+new Date(end) - 1);
	const cutoff = new Date(
		Math.ceil((+now - 30 * 86400000) / 86400000) * 86400000,
	)
		.toISOString()
		.slice(0, 10);
	const days = (
		await c.query(
			`SELECT d::date::text AS day,coalesce(s.samples,live.samples,repeat('N',96)) AS samples
    FROM generate_series($2::date,$3::date,interval '1 day') d
    LEFT JOIN daily_summaries s ON s.endpoint_id=$1 AND s.day=d::date AND d::date<$4::date
    LEFT JOIN LATERAL monitor_samples($1,d::date,d::date) live ON s.endpoint_id IS NULL
    ORDER BY day`,
			[
				endpointId,
				first.toISOString().slice(0, 10),
				last.toISOString().slice(0, 10),
				cutoff,
			],
		)
	).rows;
	return days.map((d) => {
		const date =
			typeof d.day === "string"
				? d.day
				: new Date(d.day).toISOString().slice(0, 10);
		const day = Date.parse(`${date}T00:00:00Z`);
		const from = Math.max(0, Math.ceil((+first - day) / SLOT)),
			to = Math.min(96, Math.ceil((+new Date(end) - day) / SLOT));
		const samples = d.samples.slice(from, to);
		return { day: date, samples, ...countSamples(samples) };
	});
}
export { sumAvailability };

// A service contributes one vote per scheduled slot across its historically required monitors.
export function combineSamples(sampleStrings) {
	const width = sampleStrings[0]?.length ?? 0;
	if (sampleStrings.some((s) => s.length !== width))
		throw new Error("misaligned_samples");
	return Array.from({ length: width }, (_, i) => {
		const codes = sampleStrings.map((s) => s[i]);
		return codes.includes("F")
			? "F"
			: codes.includes("U")
				? "U"
				: codes.includes("S")
					? "S"
					: codes.includes("M")
						? "M"
						: "N";
	}).join("");
}

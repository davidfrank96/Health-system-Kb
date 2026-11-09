import type { PoolClient } from "pg";
import { z } from "zod";
import {
	endpointHistory,
	combineSamples,
	countSamples,
	sumAvailability,
} from "../../../monitoring/store.mjs";
import type { Availability } from "../../../monitoring/model.mjs";
import { environment, roleFor, HttpError, type Staff } from "./security";
const DAY = 86400000;
export const kinds = z.enum([
	"daily",
	"weekly",
	"monthly",
	"qa",
	"rolling30",
	"history90",
]);
export function reportPeriod(q: URLSearchParams, now = Date.now()) {
	const kind = kinds.parse(q.get("kind")),
		start = new Date(z.iso.datetime().parse(q.get("start"))),
		end = new Date(z.iso.datetime().parse(q.get("end")));
	const max = {
		daily: 1,
		weekly: 7,
		monthly: 31,
		qa: 90,
		rolling30: 30,
		history90: 90,
	}[kind];
	if (
		+start % DAY !== 0 ||
		+end <= +start ||
		+end > now + 1000 ||
		now - +start > 366 * DAY ||
		+end - +start > max * DAY ||
		(kind === "monthly" &&
			(start.getUTCDate() !== 1 ||
				+end > Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)))
	)
		throw new HttpError(400, "invalid_period");
	return { kind, start, end };
}
export function csvCell(value: unknown) {
	const text = String(value ?? "");
	return (
		'"' +
		(/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/u.test(text) ? "'" : "") +
		text.replaceAll('"', '""') +
		'"'
	);
}
type Detail = {
	category: string;
	service: string;
	source: string;
	observedAt: string;
	measure: string;
	value: string;
	unit: string;
	quality: string;
	coverage: string;
};
export async function buildReport(
	c: PoolClient,
	env: z.infer<typeof environment>,
	period: ReturnType<typeof reportPeriod>,
) {
	const { start, end, kind } = period,
		params = [env, start, end],
		records: Detail[] = [];
	const services = (
		await c.query(
			"SELECT id,name FROM services WHERE environment=$1 ORDER BY name,id LIMIT 101",
			[env],
		)
	).rows;
	if (services.length > 100) throw new HttpError(413, "report_service_limit");
	const names = new Map(services.map((s) => [s.id, s.name]));
	const add = (
		category: string,
		service: string | null,
		source: string,
		time: Date | string | null,
		measure: string,
		value: string | number | null,
		unit = "",
		quality = "recorded",
		coverage = "",
	) => {
		records.push({
			category,
			service: names.get(service) ?? "",
			source,
			observedAt: time ? new Date(time).toISOString() : "",
			measure,
			value: value === null ? "Unavailable" : String(value),
			unit,
			quality,
			coverage,
		});
		if (records.length > 5000) throw new HttpError(413, "narrow_report_period");
	};
	const endpoints = (
		await c.query(
			"SELECT id,service_id FROM endpoints WHERE environment=$1 AND jsonb_array_length(enabled_windows)>0 ORDER BY id LIMIT 101",
			[env],
		)
	).rows;
	if (endpoints.length > 100) throw new HttpError(413, "report_endpoint_limit");
	const sums: Availability[] = [];
	for (const s of services) {
		const days = new Map<string, string[]>();
		for (const e of endpoints.filter((e) => e.service_id === s.id))
			for (const d of await endpointHistory(c, e.id, start, end))
				days.set(d.day, [...(days.get(d.day) ?? []), d.samples]);
		const counts = sumAvailability(
			[...days.values()].map((slots) => countSamples(combineSamples(slots))),
		);
		sums.push(counts);
		add(
			"Application",
			s.id,
			"15-minute samples",
			end,
			"Observed availability",
			counts.observed === null
				? null
				: Number((100 * counts.observed).toFixed(3)),
			"%",
			counts.expected ? "sampled" : "missing",
			`${counts.success} successful, ${counts.failure} failed, ${counts.unknown} unknown, ${counts.excluded} excluded`,
		);
	}
	const availability = sumAvailability(sums);
	const outages = (
		await c.query(
			`SELECT d.*,e.service_id FROM downtime_events d JOIN endpoints e ON e.id=d.endpoint_id WHERE d.environment=$1 AND confirmed_at<$3 AND (resolved_at IS NULL OR resolved_at>$2) ORDER BY confirmed_at LIMIT 501`,
			params,
		)
	).rows;
	if (outages.length > 500) throw new HttpError(413, "narrow_report_period");
	for (const d of outages) {
		add(
			"Downtime",
			d.service_id,
			"HTTPS observations",
			d.confirmed_at,
			"Confirmed downtime",
			d.id,
		);
		if (d.resolved_at && +d.resolved_at < +end)
			add(
				"Downtime",
				d.service_id,
				"HTTPS observations",
				d.resolved_at,
				"Recovery confirmed",
				d.id,
			);
	}
	const metrics = (
		await c.query(
			`WITH points AS (
 SELECT service_id,provider,resource_id,metric_name,source_method,(observed_at AT TIME ZONE 'UTC')::date AS day,count(*) n,sum(value::numeric) total,min(value) lo,max(value) hi,max(observed_at) latest,'raw' storage FROM metric_snapshots WHERE environment=$1 AND current_value AND observed_at>=$2 AND observed_at<$3 GROUP BY 1,2,3,4,5,6
 UNION ALL SELECT service_id,provider,resource_id,metric_name,source_method,day,sample_count,total,minimum,maximum,NULL::timestamptz,'daily' FROM metric_daily WHERE environment=$1 AND day>=$2::timestamptz AND day+1<=$3::timestamptz)
 SELECT p.service_id,p.provider,p.resource_id,p.metric_name,p.source_method,p.day::text,d.unit,d.aggregation,sum(n)::int n,(sum(total)/sum(n))::float8 mean,min(lo) lo,max(hi) hi,max(latest) latest,string_agg(DISTINCT storage,'+') storage FROM points p JOIN metric_definitions d ON d.name=p.metric_name GROUP BY 1,2,3,4,5,6,7,8 ORDER BY 6,1,2,3,4,5 LIMIT 2001`,
			params,
		)
	).rows;
	if (metrics.length > 2000) throw new HttpError(413, "narrow_report_period");
	let manualSnapshotCount = 0;
	for (const m of metrics) {
		if (m.source_method !== "provider_api") manualSnapshotCount += m.n;
		add(
			"Infrastructure",
			m.service_id,
			m.provider + " / " + m.source_method + " / " + m.storage,
			m.latest ?? m.day,
			m.metric_name +
				" · " +
				(m.resource_id ?? "service") +
				" · " +
				m.aggregation,
			m.mean,
			m.unit,
			m.latest
				? +end - +m.latest >
					(m.source_method === "provider_api" ? 45 : 1440) * 60000
					? "stale at period end"
					: "observed"
				: "retained UTC day",
			`${m.n} samples · min ${m.lo} · max ${m.hi}`,
		);
	}
	const resources = (
		await c.query(
			"SELECT id,name,service_id,provider,collection_state,last_success,enabled FROM integrations WHERE environment=$1 ORDER BY id LIMIT 101",
			[env],
		)
	).rows;
	if (resources.length > 100) throw new HttpError(413, "report_resource_limit");
	for (const r of resources)
		add(
			"Collection now",
			r.service_id,
			r.provider,
			r.last_success,
			r.name,
			r.collection_state,
			"",
			r.enabled ? "last collector state" : "disabled",
		);
	const qa = (
		await c.query(
			`SELECT service_id,method,payload->>'suiteName' AS suite,(completed_at AT TIME ZONE 'UTC')::date::text AS day,payload->>'status' status,count(*)::int runs,
 ${["passed", "failed", "skipped", "flaky"].map((k) => `sum((payload->'counts'->>'${k}')::int)::float8 ${k}`).join(",")},max(completed_at) latest FROM qa_runs WHERE environment=$1 AND completed_at>=$2 AND completed_at<$3 GROUP BY 1,2,3,4,5 ORDER BY 4,1,2,3,5 LIMIT 1001`,
			params,
		)
	).rows;
	if (qa.length > 1000) throw new HttpError(413, "narrow_report_period");
	for (const r of qa)
		add(
			"QA",
			r.service_id,
			r.method,
			r.latest,
			r.suite + " · " + r.status + " runs",
			r.runs,
			"runs",
			"schedule unverified",
			`${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped; ${r.flaky} flaky among executed`,
		);
	const incidents = (
		await c.query(
			`SELECT i.*,last.status period_status,last.recorded_at period_update FROM incidents i
 JOIN LATERAL (SELECT status,recorded_at FROM incident_updates WHERE incident_id=i.id AND recorded_at<$3 ORDER BY version DESC LIMIT 1) last ON true
 WHERE i.environment=$1 AND i.created_at<$3 AND (last.status<>'resolved' OR last.recorded_at>=$2) ORDER BY i.created_at LIMIT 501`,
			params,
		)
	).rows;
	if (incidents.length > 500) throw new HttpError(413, "narrow_report_period");
	for (const i of incidents)
		add(
			"Incidents",
			i.service_id,
			"staff timeline",
			i.created_at,
			i.title,
			i.period_status,
			"",
			i.severity,
			`Reported start ${i.started_at?.toISOString() ?? "unknown"} · Reported resolution: ${i.period_status === "resolved" ? i.resolved_at?.toISOString() : "not resolved by period end"} · Last recorded update: ${i.period_update.toISOString()} · ${+i.created_at >= +start ? "opened in period" : "carried in"}`,
		);
	const windows = (
		await c.query(
			"SELECT * FROM maintenance_windows WHERE environment=$1 AND starts_at<$3 AND ends_at>$2 ORDER BY starts_at LIMIT 501",
			params,
		)
	).rows;
	if (windows.length > 500) throw new HttpError(413, "narrow_report_period");
	for (const w of windows)
		add(
			"Maintenance",
			w.service_id,
			"staff schedule",
			w.starts_at,
			w.title,
			w.ends_at.toISOString(),
			"",
			w.cancelled_at ? "cancelled" : "approved",
		);
	const sections = [
		{
			title: "Coverage limits",
			text: "Unknown slots are not successes. Infrastructure series cover only recorded samples and supported metrics. Retained metrics represent complete UTC days only. Collection states are current, not a history of collector failures. No QA schedule is assumed.",
		},
		{
			title: "Application availability",
			text: `${availability.success} successes, ${availability.failure} failures, ${availability.unknown} unknown, ${availability.excluded} maintenance slots. ${outages.length} confirmed downtime events intersect this period.`,
		},
		{
			title: "Infrastructure",
			text: metrics.length
				? `${metrics.length} daily series readings. Means use recorded sample counts.`
				: "No infrastructure observations in this period.",
		},
		{
			title: "QA",
			text: qa.length
				? `${qa.reduce((s, r) => s + r.runs, 0)} completed runs. Flaky cases are a subset of executed cases.`
				: "No completed QA runs in this period.",
		},
		{
			title: "Operations",
			text: `${incidents.length} incidents intersect the period, ${incidents.filter((i) => i.period_status !== "resolved").length} unresolved at its end; ${incidents.filter((i) => +i.created_at >= +start).length} opened and ${incidents.filter((i) => i.period_status === "resolved").length} resolved during the period. ${windows.length} maintenance records.`,
		},
	];
	return {
		environment: env,
		kind,
		start: start.toISOString(),
		end: end.toISOString(),
		generatedAt: new Date().toISOString(),
		calculationVersion: "lean-v1",
		availability,
		manualSnapshotCount,
		sections,
		records,
	};
}
export async function reportResponse(
	c: PoolClient,
	staff: Staff,
	q: URLSearchParams,
	exporting: boolean,
	headers: Headers,
) {
	await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
	const env = environment.parse(q.get("environment"));
	roleFor(staff, env);
	const period = reportPeriod(q),
		report = await buildReport(c, env, period);
	if (period.kind === "monthly") {
		const prev = new Date(
				Date.UTC(
					period.start.getUTCFullYear(),
					period.start.getUTCMonth() - 1,
					1,
				),
			),
			span =
				+period.end ===
				Date.UTC(
					period.start.getUTCFullYear(),
					period.start.getUTCMonth() + 1,
					1,
				)
					? +period.start - +prev
					: Math.min(+period.end - +period.start, +period.start - +prev);
		if (Date.now() - +prev <= 366 * DAY) {
			const previous = await buildReport(c, env, {
				kind: "monthly",
				start: prev,
				end: new Date(+prev + span),
			});
			if (
				previous.availability.observed !== null &&
				report.availability.observed !== null
			)
				report.sections.push({
					title: "Previous month",
					text: `Prior period ${previous.start} to ${previous.end}: ${previous.availability.success} successful and ${previous.availability.failure} failed service slots; observed availability ${(100 * previous.availability.observed).toFixed(2)}%.`,
				});
		}
	}
	if (!exporting) return Response.json(report, { headers });
	const columns = [
		"category",
		"service",
		"source",
		"observedAt",
		"measure",
		"value",
		"unit",
		"quality",
		"coverage",
	] as const;
	const csv =
		[
			["environment", "startUTC", "endUTC", ...columns],
			...report.sections.map((s) => [
				env,
				report.start,
				report.end,
				"Summary",
				"",
				"stored evidence",
				report.generatedAt,
				s.title,
				s.text,
				"",
				"",
				"",
			]),
			...report.records.map((row) => [
				env,
				report.start,
				report.end,
				...columns.map((k) => row[k]),
			]),
		]
			.map((row) => row.map(csvCell).join(","))
			.join("\r\n") + "\r\n";
	if (Buffer.byteLength(csv) > 1048576)
		throw new HttpError(413, "narrow_report_period");
	await c.query(
		"INSERT INTO audit_events(actor,environment,action,result) VALUES($1,$2,'report.export',$3)",
		[
			staff.id,
			env,
			JSON.stringify({
				kind: period.kind,
				start: report.start,
				end: report.end,
				rows: report.records.length,
			}),
		],
	);
	headers.set("Content-Type", "text/csv; charset=utf-8");
	headers.set(
		"Content-Disposition",
		`attachment; filename="kbean-${env}-${period.kind}-${report.start.slice(0, 10)}.csv"`,
	);
	headers.set("X-Content-Type-Options", "nosniff");
	return new Response(csv, { headers });
}

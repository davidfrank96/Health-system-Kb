"use client";
import { useMemo, useState } from "react";
import { Field, State, useRead } from "./shared";
type Row = {
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
type Report = {
	start: string;
	end: string;
	generatedAt: string;
	availability: {
		expected: number;
		observed: number | null;
		coverage: number | null;
	};
	sections: { title: string; text: string }[];
	records: Row[];
};
const options = {
	daily: "Daily",
	weekly: "Last 7 days",
	rolling30: "Last 30 days",
	monthly: "Calendar month",
	history90: "Last 90 days",
} as const;
export function Reports({ env }: { env: string }) {
	const [kind, select] = useState<keyof typeof options>("daily"),
		[date, choose] = useState(() => new Date().toISOString().slice(0, 10)),
		[category, filter] = useState(""),
		[downloadError, error] = useState("");
	const query = useMemo(() => {
		if (!/^\d{4}-\d\d-\d\d$/.test(date)) return null;
		const d = new Date(date + "T00:00:00Z"),
			day = 86400000;
		const start =
			kind === "monthly"
				? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
				: +d -
					({ daily: 1, weekly: 7, rolling30: 30, history90: 90 }[kind] - 1) *
						day;
		const end = Math.min(
			Date.now(),
			kind === "monthly"
				? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
				: +d + day,
		);
		if (end <= start) return null;
		return new URLSearchParams({
			environment: env,
			kind,
			start: new Date(start).toISOString(),
			end: new Date(end).toISOString(),
		}).toString();
	}, [kind, date, env]);
	const read = useRead<Report>(query ? "reports/summary?" + query : null),
		data = read.data;
	return (
		<section className="panel ops-panel">
			<h2>Health report</h2>
			<div className="ops-filters">
				<Field label="Report period">
					<select
						value={kind}
						onChange={(e) => select(e.target.value as keyof typeof options)}
					>
						{Object.entries(options).map(([k, label]) => (
							<option value={k} key={k}>
								{label}
							</option>
						))}
					</select>
				</Field>
				<Field label="Reporting date (UTC)">
					<input
						type="date"
						value={date}
						max={new Date().toISOString().slice(0, 10)}
						onChange={(e) => choose(e.target.value)}
					/>
				</Field>
			</div>
			{!query ? (
				<p>Select a date with elapsed observations.</p>
			) : !data ? (
				<State read={read} />
			) : (
				<>
					<p>
						{data.start} to {data.end} (end exclusive) · {env}
					</p>
					<div className="report-measures">
						{(
							[
								["Observed availability", data.availability.observed],
								["Monitoring coverage", data.availability.coverage],
							] as const
						).map(([label, value]) => (
							<div key={label}>
								<span>{label}</span>
								<strong>
									{value === null
										? "Unavailable"
										: (100 * value).toFixed(2) + "%"}
								</strong>
								{value !== null && (
									<meter min={0} max={1} value={value} aria-label={label} />
								)}
							</div>
						))}
					</div>
					{data.sections.map((s) => (
						<article key={s.title}>
							<h3>{s.title}</h3>
							<p>{s.text}</p>
						</article>
					))}
					<button
						type="button"
						onClick={async () => {
							try {
								const r = await fetch("/api/v1/reports/export?" + query);
								if (!r.ok) throw Error();
								const url = URL.createObjectURL(await r.blob()),
									a = document.createElement("a");
								a.href = url;
								a.download = "kbean-" + env + "-" + kind + "-" + date + ".csv";
								a.click();
								setTimeout(() => URL.revokeObjectURL(url), 1000);
								error("");
							} catch {
								error("Export unavailable. Retry or select a shorter period.");
							}
						}}
					>
						Download private CSV
					</button>
					{downloadError && <p role="alert">{downloadError}</p>}
					<h3>Period evidence</h3>
					<Field label="Evidence category">
						<select value={category} onChange={(e) => filter(e.target.value)}>
							<option value="">All categories</option>
							{[...new Set(data.records.map((r) => r.category))].map((x) => (
								<option key={x}>{x}</option>
							))}
						</select>
					</Field>
					{!data.records.length && <p>No stored evidence in this period.</p>}
					{data.records
						.filter((r) => !category || r.category === category)
						.map((r, i) => (
							<article key={String(i)}>
								<strong>
									{r.measure} · {r.value} {r.unit}
								</strong>
								<p>
									{r.service} · {r.source} · {r.quality}
								</p>
								<small>
									{r.observedAt} · {r.coverage}
								</small>
							</article>
						))}
				</>
			)}
		</section>
	);
}
type Attention = {
	observedAt: string;
	activeDowntime: number;
	qaFailures: number;
	openIncidents: number;
	maintenance: number;
	metrics: number;
};
export function Attention({ env }: { env: string }) {
	const read = useRead<Attention>("reports/attention?environment=" + env);
	return (
		<section className="panel ops-panel">
			<h2>Operational activity</h2>
			{read.data ? (
				<>
					<p>
						{read.data.activeDowntime} open confirmed downtime events ·{" "}
						{read.data.openIncidents} open incidents · {read.data.maintenance}{" "}
						active maintenance windows
					</p>
					<p>
						{read.data.metrics} infrastructure observations and{" "}
						{read.data.qaFailures} failed or errored QA runs in the last 24
						hours.
					</p>
					<small>Stored operational evidence · {read.data.observedAt}</small>
				</>
			) : (
				<State read={read} />
			)}
		</section>
	);
}

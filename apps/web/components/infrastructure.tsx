"use client";
import { useState, useEffect } from "react";
import {
	csvHeader,
	dictionary,
	metricNames,
	providers,
	type MetricName,
} from "../../../infrastructure/metrics";
type Service = { id: string; name: string };
type Resource = {
	id: string;
	name: string;
	provider: string;
	serviceName: string;
	resourceType: string;
	region: string | null;
	capabilities: string[];
	collectionState: string;
	costStatus: string;
	permissionReviewed: boolean;
	approvalExpiresAt: string | null;
	lastSuccessAt: string | null;
};
type Reading = {
	id: string;
	serviceId: string;
	resourceId: string | null;
	provider: string;
	metricName: MetricName;
	unit: string;
	value: number;
	observedAt: string;
	ingestedAt: string;
	sourceMethod: string;
	quality: string;
	sourceReference: string;
};
type Point = {
	observedAt: string;
	value?: number;
	mean?: number;
	samples?: number;
	sourceMethod: string;
	provider: string;
	resourceId: string | null;
};
async function get<T>(url: string, signal: AbortSignal): Promise<T[]> {
	const items: T[] = [];
	let cursor: string | null = null;
	do {
		const r: Response = await fetch(
			url + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
			{ signal },
		);
		if (!r.ok) throw Error();
		const page: { items: T[]; nextCursor: string | null } = await r.json();
		items.push(...page.items);
		cursor = page.nextCursor;
		if (cursor && items.length >= 2000) throw Error("Narrow filter");
	} while (cursor);
	return items;
}
type Series = Pick<
	Reading,
	| "serviceId"
	| "resourceId"
	| "provider"
	| "metricName"
	| "unit"
	| "sourceMethod"
	| "quality"
>;
function History({ env, reading }: { env: string; reading: Series }) {
	const [days, period] = useState(reading.quality === "archived" ? 90 : 1),
		[points, set] = useState<Point[] | null>(null),
		[failed, fail] = useState(false),
		[retry, refresh] = useState(0);
	useEffect(() => {
		void retry;
		const abort = new AbortController();
		set(null);
		fail(false);
		const end = new Date(),
			q = new URLSearchParams({
				environment: env,
				serviceId: reading.serviceId,
				provider: reading.provider,
				metricName: reading.metricName,
				limit: "100",
				start: new Date(+end - days * 86400000).toISOString(),
				end: end.toISOString(),
				resolution: days >= 7 ? "daily" : "raw",
			});
		get<Point>("/api/v1/metrics/history?" + q, abort.signal)
			.then((rows) =>
				set(
					rows.filter(
						(r) =>
							r.sourceMethod === reading.sourceMethod &&
							r.resourceId === reading.resourceId,
					),
				),
			)
			.catch(() => {
				if (!abort.signal.aborted) fail(true);
			});
		return () => abort.abort();
	}, [env, reading, days, retry]);
	const now = Date.now(),
		values = points?.map((p) => p.value ?? p.mean ?? NaN) ?? [],
		max = Math.max(...values, 1);
	return (
		<section className="panel">
			<h2>{reading.metricName} history</h2>
			<label>
				Observation period{" "}
				<select value={days} onChange={(e) => period(Number(e.target.value))}>
					{[1, 7, 30, 90].map((n) => (
						<option key={n} value={n}>
							{n === 1 ? "24 hours" : n + " days"}
						</option>
					))}
				</select>
			</label>
			<p>
				{reading.unit} · {reading.provider} · {reading.sourceMethod} · UTC ·{" "}
				{reading.quality}
			</p>
			{failed ? (
				<button type="button" onClick={() => refresh((n) => n + 1)}>
					Retry history
				</button>
			) : !points ? (
				<p>Loading history…</p>
			) : !points.length ? (
				<p>No observations in this period.</p>
			) : (
				<>
					<small>
						{new Date(now - days * 86400000).toISOString().slice(0, 16)} to{" "}
						{new Date(now).toISOString().slice(0, 16)} UTC · Scale 0–{max}{" "}
						{reading.unit}
					</small>
					<svg
						role="img"
						aria-label={reading.metricName + " observations in UTC"}
						viewBox="0 0 500 112"
						width="100%"
						style={{ maxHeight: 180 }}
					>
						<path d="M5 3V105H496" stroke="currentColor" fill="none" />
						{points.map((p, i) => (
							<circle
								key={p.observedAt}
								cx={Math.min(
									495,
									Math.max(
										6,
										495 -
											(488 * (now - Date.parse(p.observedAt))) /
												(days * 86400000),
									),
								)}
								cy={103 - (95 * values[i]) / max}
								r="3"
								fill="currentColor"
							>
								<title>
									{p.observedAt} · {values[i]} {reading.unit}
								</title>
							</circle>
						))}
					</svg>
					<p>
						{points.reduce((s, p) => s + (p.samples ?? 1), 0)} recorded samples.
						Gaps have no measured value.
						{days >= 7 ? " Points show daily sample means." : ""}
					</p>
					<details>
						<summary>View readings</summary>
						{points.map((p, i) => (
							<p key={p.observedAt}>
								{p.observedAt} · {values[i]} {reading.unit}
							</p>
						))}
					</details>
				</>
			)}
		</section>
	);
}
type Preview = {
	digest: string;
	invalidRows: number;
	validRows: number;
	errors: { row: number; message: string }[];
	readings: {
		serviceId: string;
		environment: string;
		provider: string;
		aggregation: string;
		sourceReference: string;
		note: string;
		metricName: string;
		value: number;
		unit: string;
		observedAt: string;
	}[];
};
function Entry({
	env,
	csrf,
	services,
	onSave,
}: {
	env: string;
	csrf: string;
	services: Service[];
	onSave: () => void;
}) {
	const [method, mode] = useState("manual"),
		[metric, choose] = useState<MetricName>("cpu_utilization"),
		[csv, file] = useState(""),
		[preview, show] = useState<Preview | null>(null),
		[message, msg] = useState(""),
		[busy, working] = useState(false),
		[key, resetKey] = useState(() => crypto.randomUUID());
	const [unit, aggregation] = dictionary[metric];
	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		working(true);
		msg("");
		try {
			const manual = method === "manual",
				q = new URLSearchParams({ environment: env, dryRun: String(!preview) }),
				headers: Record<string, string> = {
					"Content-Type": manual ? "application/json" : "text/csv",
					"X-CSRF-Token": csrf,
					"Idempotency-Key": key,
				};
			if (preview) headers["X-Preview-Digest"] = preview.digest;
			const body = manual
				? JSON.stringify({
						serviceId: form.get("service"),
						provider: form.get("provider"),
						environment: env,
						metricName: metric,
						unit,
						aggregation,
						value: Number(form.get("value")),
						observedAt: new Date(
							String(form.get("observed")) + "Z",
						).toISOString(),
						sourceReference: form.get("source"),
						note: form.get("note"),
						...(form.get("supersedes")
							? {
									supersedesId: form.get("supersedes"),
									correctionReason: form.get("reason"),
								}
							: {}),
					})
				: csv;
			const r = await fetch(
				"/api/v1/metrics/" + (manual ? "snapshots" : "imports?" + q),
				{ method: "POST", headers, body },
			);
			const data = await r.json();
			if (!r.ok) {
				msg(data.title ?? "Submission failed.");
				return;
			}
			if (!manual && !preview) {
				show(data);
				return;
			}
			show(null);
			resetKey(crypto.randomUUID());
			msg("Measurements saved.");
			onSave();
		} catch {
			msg("Could not submit measurements.");
		} finally {
			working(false);
		}
	}
	return (
		<section className="panel">
			<h2>Record measurements</h2>
			<label>
				Entry method{" "}
				<select
					value={method}
					onChange={(e) => {
						mode(e.target.value);
						show(null);
						msg("");
					}}
				>
					<option value="manual">Manual entry</option>
					<option value="csv">CSV import</option>
				</select>
			</label>
			<form
				className="metric-form"
				onSubmit={submit}
				onChange={() => {
					show(null);
					resetKey(crypto.randomUUID());
					msg("");
				}}
			>
				{method === "manual" ? (
					<>
						<label>
							Service
							<select name="service" required>
								{services.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
						</label>
						<label>
							Provider
							<select name="provider">
								{providers.map((p) => (
									<option key={p}>{p}</option>
								))}
							</select>
						</label>
						<label>
							Metric
							<select
								value={metric}
								onChange={(e) => choose(e.target.value as MetricName)}
							>
								{metricNames.map((m) => (
									<option key={m}>{m}</option>
								))}
							</select>
						</label>
						<label>
							Value ({unit}, {aggregation})
							<input name="value" type="number" min="0" step="any" required />
						</label>
						<label>
							Observed at (UTC)
							<input
								name="observed"
								type="datetime-local"
								step="0.001"
								required
							/>
						</label>
						<label>
							Source reference
							<input name="source" required />
						</label>
						<label>
							Supporting note
							<input name="note" required />
						</label>
						<details>
							<summary>Correct an existing reading</summary>
							<label>
								Observation ID
								<input name="supersedes" />
							</label>
							<label>
								Correction reason
								<input name="reason" />
							</label>
						</details>
						<label>
							<input type="checkbox" required /> I confirm this measurement.
						</label>
					</>
				) : (
					<>
						<label>
							CSV file
							<input
								type="file"
								accept=".csv,text/csv"
								onChange={async (e) => {
									const f = e.target.files?.[0];
									file("");
									if (!f) return;
									try {
										if (f.size > 262144) throw Error();
										file(
											new TextDecoder("utf-8", { fatal: true }).decode(
												await f.arrayBuffer(),
											),
										);
									} catch {
										msg("Use a UTF-8 CSV up to 256 KiB.");
									}
								}}
							/>
						</label>
						<label>
							CSV content
							<textarea
								rows={4}
								value={csv}
								placeholder={csvHeader}
								onChange={(e) => file(e.target.value)}
							/>
						</label>
						{preview && (
							<div aria-live="polite">
								<strong>
									{preview.validRows} valid · {preview.invalidRows} rejected
								</strong>
								{preview.errors.map((r) => (
									<p key={r.row}>
										Row {r.row} · {r.message}
									</p>
								))}
								<details open>
									<summary>Normalized readings</summary>
									{preview.readings.map((r, i) => (
										<p key={String(i)}>
											{services.find((s) => s.id === r.serviceId)?.name ??
												r.serviceId}{" "}
											· {r.environment} · {r.provider}
											<br />
											{r.observedAt} · {r.metricName} · {r.value} {r.unit} (
											{r.aggregation})<br />
											{r.sourceReference} · {r.note}
										</p>
									))}
								</details>
							</div>
						)}
					</>
				)}
				<button type="submit" disabled={busy || !!preview?.invalidRows}>
					{method === "manual"
						? "Save measurement"
						: preview
							? "Confirm import"
							: "Preview CSV"}
				</button>
			</form>
			<p role="status">{message}</p>
		</section>
	);
}
export function Infrastructure({
	env,
	csrf,
	write,
}: {
	env: string;
	csrf: string;
	write: boolean;
}) {
	const [filter, select] = useState(""),
		[data, set] = useState<{
			resources: Resource[];
			readings: Reading[];
			archived: Series[];
			services: Service[];
		} | null>(null),
		[failed, fail] = useState(false),
		[revision, refresh] = useState(0),
		[selected, history] = useState<Series | null>(null);
	useEffect(() => {
		void revision;
		const abort = new AbortController();
		set(null);
		fail(false);
		history(null);
		const q = "?environment=" + env + "&limit=100",
			p = filter ? "&provider=" + filter : "";
		Promise.all([
			get<Resource>("/api/v1/integrations" + q + p, abort.signal),
			get<Reading>("/api/v1/metrics/latest" + q + p, abort.signal),
			get<Service>("/api/v1/services" + q, abort.signal),
			get<Series>("/api/v1/metrics/series" + q + p, abort.signal),
		])
			.then(([resources, readings, services, archived]) => {
				if (!abort.signal.aborted)
					set({ resources, readings, services, archived });
			})
			.catch(() => {
				if (!abort.signal.aborted) fail(true);
			});
		return () => abort.abort();
	}, [env, filter, revision]);
	return (
		<>
			<section className="panel">
				<h2>Infrastructure readings</h2>
				<label>
					Filter provider{" "}
					<select value={filter} onChange={(e) => select(e.target.value)}>
						<option value="">All providers</option>
						{providers.map((p) => (
							<option key={p}>{p}</option>
						))}
					</select>
				</label>
				{failed ? (
					<div role="alert">
						Infrastructure readings could not be loaded.{" "}
						<button type="button" onClick={() => refresh((n) => n + 1)}>
							Retry readings
						</button>
					</div>
				) : !data ? (
					<p>Loading infrastructure readings…</p>
				) : (
					<>
						{!data.resources.length ? (
							<p>No configured resources for this view.</p>
						) : (
							data.resources.map((r) => (
								<article key={r.id}>
									<h3>{r.name}</h3>
									<p>
										{r.provider} · {r.resourceType} · {r.region} ·{" "}
										{r.serviceName}
									</p>
									<p>
										{r.collectionState} ·{" "}
										{r.permissionReviewed
											? "Permissions reviewed"
											: "Permissions unverified"}{" "}
										· {r.costStatus} · Last synchronization{" "}
										{r.lastSuccessAt ?? "unavailable"}
										{r.approvalExpiresAt && (
											<> · Approval expires {r.approvalExpiresAt}</>
										)}
									</p>
									<p>
										{r.capabilities
											.map(
												(m) =>
													m +
													(data.readings.some(
														(v) => v.resourceId === r.id && v.metricName === m,
													)
														? ""
														: " (missing)"),
											)
											.join(", ") || "No supported metrics"}
									</p>
								</article>
							))
						)}
						{data.archived.length > 0 && (
							<details>
								<summary>Archived metric series</summary>
								{data.archived.map((series) => (
									<button
										type="button"
										key={JSON.stringify(series)}
										onClick={() => history(series)}
									>
										{data.services.find((s) => s.id === series.serviceId)?.name}{" "}
										· {series.metricName} · {series.sourceMethod}
									</button>
								))}
							</details>
						)}
						<h3>Latest measurements</h3>
						{!data.readings.length ? (
							<p>No infrastructure readings yet</p>
						) : (
							data.readings.map((r) => (
								<article key={r.id}>
									<button type="button" onClick={() => history(r)}>
										{r.metricName} · {r.value} {r.unit}
									</button>
									<p>
										{data.services.find((s) => s.id === r.serviceId)?.name} ·{" "}
										{r.provider} · {r.sourceMethod} · {r.quality}
									</p>
									<small>
										Observed {r.observedAt} · Ingested {r.ingestedAt} ·{" "}
										{r.sourceReference}
									</small>
									<details>
										<summary>Reading ID</summary>
										{r.id}
									</details>
								</article>
							))
						)}
					</>
				)}
			</section>
			{selected && (
				<History key={JSON.stringify(selected)} env={env} reading={selected} />
			)}
			{write && data && (
				<Entry
					env={env}
					csrf={csrf}
					services={data.services}
					onSave={() => refresh((n) => n + 1)}
				/>
			)}
		</>
	);
}

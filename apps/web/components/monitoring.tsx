"use client";
import { useEffect, useState, type FormEvent } from "react";
import type {
	Endpoint,
	EndpointInput,
	statusHistory,
	statusOverview,
} from "../lib/monitoring";
import type { Environment } from "../lib/security";
import type { Service } from "../lib/inventory";
type Overview = Awaited<ReturnType<typeof statusOverview>>;
type History = Awaited<ReturnType<typeof statusHistory>>;
const time = (value: string | null | undefined) =>
	value
		? `${new Date(value).toLocaleString(undefined, { timeZone: "UTC" })} UTC`
		: "Not recorded";
const percent = (value: number | null) =>
	value === null ? "—" : `${(value * 100).toFixed(2)}%`;
function useData<T>(url: string, request: object) {
	const [data, setData] = useState<T | null>(null),
		[error, setError] = useState("");
	// biome-ignore lint/correctness/useExhaustiveDependencies: request is an explicit user-triggered reload token.
	useEffect(() => {
		const abort = new AbortController();
		setData(null);
		setError("");
		fetch(url, { cache: "no-store", signal: abort.signal })
			.then(async (r) => {
				if (r.status === 401) {
					window.location.replace("/login");
					return;
				}
				if (!r.ok)
					throw new Error(
						r.status === 403
							? "Access denied."
							: "Monitoring data could not be loaded.",
					);
				const value = await r.json();
				if (!abort.signal.aborted) setData(value);
			})
			.catch((e) => {
				if (!abort.signal.aborted) setError(e.message);
			});
		return () => abort.abort();
	}, [url, request]);
	return { data, error };
}
const initialRequest = {};
export function Monitoring({
	env,
	overview = false,
}: {
	env: Environment;
	overview?: boolean;
}) {
	const [request, setRequest] = useState(initialRequest),
		[cursor, setCursor] = useState<string | null>(null),
		[service, setService] = useState<string | null>(null);
	const { data, error } = useData<Overview>(
		`/api/v1/status/overview?environment=${env}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
		request,
	);
	return (
		<section className="monitoring" aria-label="Application monitoring">
			<div className="panel-head">
				<div>
					<p className="overline">Sampled every 15 minutes</p>
					<h2>
						{overview ? "Availability overview" : "Monitored applications"}
					</h2>
				</div>
				<button type="button" onClick={() => setRequest({})}>
					Refresh monitoring
				</button>
			</div>
			<p className="muted">
				Live collection is disabled. Local observations are controlled test
				evidence.
			</p>
			{error ? (
				<p role="alert">
					{error}{" "}
					<button type="button" onClick={() => setRequest({})}>
						Retry monitoring
					</button>
				</p>
			) : !data ? (
				<p role="status">Loading monitoring data…</p>
			) : (
				<>
					<div className="monitor-stats">
						{(
							[
								["Monitored", data.counts.monitored],
								["Healthy", data.counts.healthy],
								["Degraded", data.counts.degraded],
								["Down", data.counts.down],
								["Unknown", data.counts.unknown],
								["Stale", data.counts.stale],
							] as const
						).map(([label, count]) => (
							<article key={label}>
								<small>{label}</small>
								<strong>{count}</strong>
							</article>
						))}
					</div>
					<p className="collection">
						Latest collection:{" "}
						<strong>
							{data.latestRun
								? `${data.latestRun.status} · ${data.latestRun.quality}`
								: "No collection recorded"}
						</strong>
						{data.latestRun && (
							<>
								{" "}
								· {time(data.latestRun.startedAt)} · {data.latestRun.attempts}{" "}
								attempts
							</>
						)}
					</p>
					{!data.counts.monitored && (
						<div className="blank">
							<strong>No monitoring configured</strong>
							<p>
								Approved, enabled endpoints will appear here. Unconfigured
								services remain unknown.
							</p>
						</div>
					)}
					<div className="monitor-list">
						{data.items.map((s) => (
							<article className="monitor-row" key={s.id}>
								<div>
									<button
										type="button"
										className="service-link"
										onClick={() => setService(s.id)}
									>
										{s.name}
									</button>
									<small>
										{s.product} ·{" "}
										{s.monitored ? "Monitoring enabled" : "Not monitored"}
									</small>
								</div>
								<div>
									<span className={`health health-${s.condition}`}>
										{s.condition}
									</span>
									<small>Evidence: {s.quality}</small>
								</div>
								<div>
									<small>Last check</small>
									<span>
										{time(
											s.endpoints
												.map((e) => e.state.lastObserved)
												.filter(Boolean)
												.sort()
												.at(-1),
										)}
									</span>
								</div>
							</article>
						))}
					</div>
					<div className="pagination">
						{cursor && (
							<button type="button" onClick={() => setCursor(null)}>
								First services
							</button>
						)}
						{data.nextCursor && (
							<button type="button" onClick={() => setCursor(data.nextCursor)}>
								More services
							</button>
						)}
					</div>
					{overview && data.recentFailures.length > 0 && (
						<div className="panel">
							<h3>Recent monitoring failures</h3>
							{data.recentFailures.map((f) => (
								<p key={`${f.endpointId}-${f.scheduledSlot}`}>
									<strong>{f.name}</strong> · {f.failure} · {f.outcome} ·{" "}
									{time(f.observedAt)}
								</p>
							))}
						</div>
					)}
				</>
			)}
			{service && (
				<HistoryView
					key={service}
					service={service}
					env={env}
					close={() => setService(null)}
				/>
			)}
		</section>
	);
}
function HistoryView({
	service,
	env,
	close,
}: {
	service: string;
	env: Environment;
	close: () => void;
}) {
	const [request, setRequest] = useState({
			days: 1,
			end: new Date().toISOString(),
		}),
		[cursor, setCursor] = useState<string | null>(null);
	const start = new Date(
		Date.parse(request.end) - request.days * 86400000,
	).toISOString();
	const query = new URLSearchParams({
		environment: env,
		serviceId: service,
		start,
		end: request.end,
		limit: "100",
	});
	if (cursor) query.set("cursor", cursor);
	const { data, error } = useData<History>(
		`/api/v1/status/history?${query}`,
		request,
	);
	return (
		<section className="panel history" aria-label="Service monitoring detail">
			<div className="panel-head">
				<h2>{data?.service.name ?? "Monitoring history"}</h2>
				<button type="button" onClick={close}>
					Close detail
				</button>
			</div>
			<label>
				History period{" "}
				<select
					value={request.days}
					onChange={(e) => {
						setCursor(null);
						setRequest({
							days: Number(e.target.value),
							end: new Date().toISOString(),
						});
					}}
				>
					{[
						[1, "Last 24 hours"],
						[7, "Last 7 days"],
						[30, "Last 30 days"],
						[90, "Last 90 days"],
					].map(([n, label]) => (
						<option key={n} value={n}>
							{label}
						</option>
					))}
				</select>
			</label>
			{error ? (
				<p role="alert">
					{error}
					<button type="button" onClick={() => setRequest({ ...request })}>
						Retry history
					</button>
				</p>
			) : !data ? (
				<p role="status">Loading monitoring history…</p>
			) : (
				<>
					<h3>15-minute sampled availability</h3>
					<p className="availability-number">
						{percent(data.summary.observed)}{" "}
						<span>
							{data.summary.reason === "insufficient_coverage"
								? "Insufficient coverage"
								: data.summary.reason === "no_known_observations"
									? "No known observations"
									: data.summary.reason === "not_monitored"
										? "No eligible samples"
										: "Observed samples"}
						</span>
					</p>
					<p>
						{data.summary.expected} expected · {data.summary.success} successful
						· {data.summary.failure} failed · {data.summary.unknown} unknown ·{" "}
						{data.summary.excluded} maintenance exclusions
					</p>
					<p>
						Coverage {percent(data.summary.coverage)} · Missing-sample bounds{" "}
						{percent(data.summary.lower)}–{percent(data.summary.upper)}. Short
						outages between checks may be missed.
					</p>
					<div className="history-bars">
						{[...data.items].reverse().map((d) => (
							<div key={d.day} className="history-day">
								<div
									className="history-bar"
									role="img"
									aria-label={`${d.day}: ${d.success} successful, ${d.failure} failed, ${d.unknown} unknown, ${d.excluded} excluded`}
									title={`${d.day} · ${percent(d.observed)} observed · ${percent(d.coverage)} coverage`}
								>
									{d.expected ? (
										<>
											{d.success > 0 && (
												<span
													className="sample-success"
													style={{ flex: d.success }}
												/>
											)}
											{d.failure > 0 && (
												<span
													className="sample-failure"
													style={{ flex: d.failure }}
												/>
											)}
											{d.unknown > 0 && (
												<span
													className="sample-unknown"
													style={{ flex: d.unknown }}
												/>
											)}
										</>
									) : (
										<span className="sample-unmonitored" />
									)}
								</div>
								<small>{d.day.slice(5)}</small>
							</div>
						))}
					</div>
					<p className="muted">
						Green: success · Red: failed · Gray: unknown · Outlined: no eligible
						slots. Times use UTC.
					</p>
					{data.nextCursor && (
						<button type="button" onClick={() => setCursor(data.nextCursor)}>
							More history
						</button>
					)}
					<h3>Endpoint observations</h3>
					{!data.endpoints.length && (
						<p>No endpoints configured for this service.</p>
					)}
					{data.endpoints.map((e) => (
						<article className="endpoint-detail" key={e.id}>
							<strong className="url">{e.url}</strong>
							<p>
								<span className={`health health-${e.condition}`}>
									{e.condition}
								</span>{" "}
								· {e.enabled ? "Enabled" : "Disabled"} · {e.quality}
								{e.reason ? ` · ${e.reason}` : ""}
							</p>
							<dl>
								<dt>Last check</dt>
								<dd>{time(e.state.lastObserved)}</dd>
								<dt>Last success</dt>
								<dd>{time(e.state.lastSuccess)}</dd>
								<dt>Response</dt>
								<dd>
									{e.latest?.httpStatus ?? "No HTTP status"} ·{" "}
									{e.latest?.latencyMs ?? "—"} ms
								</dd>
								<dt>Active downtime</dt>
								<dd>
									{e.state.open
										? "Open confirmed event"
										: "No open confirmed event"}
								</dd>
							</dl>
						</article>
					))}
					<h3>Downtime and recovery</h3>
					{!data.downtimeEvents.length ? (
						<p>No confirmed downtime in this period.</p>
					) : (
						data.downtimeEvents.map((e) => (
							<article className="endpoint-detail" key={e.id}>
								<strong>
									{e.resolvedAt ? "Recovered" : "Open confirmed downtime"}
								</strong>
								<p>
									First failed observation: {time(e.firstFailedAt)}
									<br />
									Confirmed: {time(e.confirmedAt)}
									<br />
									First recovery: {time(e.firstRecoveryAt)}
									<br />
									Resolved: {time(e.resolvedAt)}
								</p>
								<p>
									{e.resolvedAt
										? `Observed span: ${Math.round((Date.parse(e.resolvedAt) - Date.parse(e.firstFailedAt)) / 60000)} minutes.`
										: "Observed duration is still open."}{" "}
									{e.evidenceGap
										? "Evidence gaps exist."
										: "No recorded evidence gaps."}{" "}
									Actual outage boundaries between samples are unknown.
								</p>
							</article>
						))
					)}
					{data.eventsTruncated && (
						<p>
							Showing the latest 100 events; narrow the period for earlier
							events.
						</p>
					)}
				</>
			)}
		</section>
	);
}
export function MonitorSettings({
	env,
	admin,
	csrf,
}: {
	env: Environment;
	admin: boolean;
	csrf: string;
}) {
	const [request, setRequest] = useState(initialRequest),
		[edit, setEdit] = useState<Endpoint | "new" | null>(null),
		[notice, setNotice] = useState(""),
		[cursor, setCursor] = useState<string | null>(null);
	const { data, error } = useData<{
		items: Endpoint[];
		nextCursor: string | null;
	}>(
		`/api/v1/endpoints?environment=${env}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
		request,
	);
	return (
		<section
			className="panel monitor-settings"
			aria-label="Monitoring configuration"
		>
			<div className="panel-head">
				<h2>Monitoring configuration</h2>
				<div>
					<button type="button" onClick={() => setRequest({})}>
						Reload monitors
					</button>
					{admin && (
						<button
							className="primary"
							type="button"
							onClick={() => {
								setEdit("new");
								setNotice("");
							}}
						>
							Add monitor
						</button>
					)}
				</div>
			</div>
			<p>
				New targets start disabled. An owner must approve the exact URL outside
				the dashboard before activation. Live collection remains disabled.
			</p>
			{edit && admin && (
				<EndpointForm
					key={edit === "new" ? "new" : edit.id}
					record={edit}
					env={env}
					csrf={csrf}
					cancel={() => setEdit(null)}
					saved={() => {
						setEdit(null);
						setNotice("Monitor saved.");
						setRequest({});
					}}
				/>
			)}
			{notice && <p role="status">{notice}</p>}
			{error ? (
				<p role="alert">{error}</p>
			) : !data ? (
				<p role="status">Loading monitor configuration…</p>
			) : !data.items.length ? (
				<p>No endpoints configured.</p>
			) : (
				data.items.map((e) => (
					<div className="endpoint-detail" key={e.id}>
						<strong className="url">{e.url}</strong>
						<p>
							{e.enabled ? "Enabled" : "Disabled"} ·{" "}
							{e.approved
								? "Owner approval recorded"
								: "Awaiting owner approval"}{" "}
							· {e.condition} · {e.quality}
						</p>
						<small>
							Last attempt: {time(e.latest?.observedAt)}
							{e.latest?.failure ? ` · ${e.latest.failure}` : ""}
						</small>
						{admin && (
							<button
								type="button"
								aria-label={`Edit monitor ${e.url}`}
								onClick={() => {
									setEdit(e);
									setNotice("");
								}}
							>
								Edit monitor
							</button>
						)}
					</div>
				))
			)}
			{cursor && (
				<button type="button" onClick={() => setCursor(null)}>
					First monitors
				</button>
			)}
			{data?.nextCursor && (
				<button type="button" onClick={() => setCursor(data.nextCursor)}>
					More monitors
				</button>
			)}
		</section>
	);
}
function EndpointForm({
	record,
	env,
	csrf,
	cancel,
	saved,
}: {
	record: Endpoint | "new";
	env: Environment;
	csrf: string;
	cancel: () => void;
	saved: () => void;
}) {
	const existing = record === "new" ? null : record;
	const [busy, setBusy] = useState(false),
		[error, setError] = useState(""),
		[key, setKey] = useState(() => crypto.randomUUID());
	const { data: services } = useData<{ items: Service[] }>(
		`/api/v1/services?environment=${env}&limit=100`,
		initialRequest,
	);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy) return;
		const form = new FormData(event.currentTarget);
		setBusy(true);
		setError("");
		const body: EndpointInput = {
			environment: env,
			serviceId: existing?.serviceId ?? String(form.get("serviceId")),
			url: String(form.get("url")),
			enabled: form.get("enabled") === "on",
			required: form.get("required") === "on",
			expectedCodes: String(form.get("codes")).split(",").map(Number),
			failureThreshold: Number(form.get("failureThreshold")),
			recoveryThreshold: Number(form.get("recoveryThreshold")),
			slowMs: Number(form.get("slowMs")),
			clearMs: Number(form.get("clearMs")),
		};
		try {
			const response = await fetch(
				`/api/v1/endpoints${existing ? `/${existing.id}` : ""}`,
				{
					method: existing ? "PATCH" : "POST",
					headers: {
						"Content-Type": "application/json",
						"X-CSRF-Token": csrf,
						"Idempotency-Key": key,
						...(existing ? { "If-Match": `"${existing.version}"` } : {}),
					},
					body: JSON.stringify(body),
				},
			);
			if (response.status === 401) {
				window.location.replace("/login");
				return;
			}
			if (!response.ok) {
				const problem = await response.json();
				setError(
					problem.code === "target_approval_required"
						? "Owner approval is required for this exact URL."
						: response.status === 403
							? "Access denied."
							: response.status === 409
								? "Configuration changed or limit reached. Cancel and reload before editing."
								: "Check the target URL and configuration fields.",
				);
				return;
			}
			saved();
		} catch {
			setError("The save could not be confirmed. Retry to check the result.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<form
			className="editor"
			onSubmit={submit}
			onChange={() => setKey(crypto.randomUUID())}
		>
			<h3>{existing ? "Edit endpoint" : "New endpoint"}</h3>
			<fieldset disabled={busy}>
				<label>
					Monitored service
					<select
						name="serviceId"
						required
						disabled={!!existing}
						defaultValue={existing?.serviceId ?? ""}
					>
						<option value="">Choose a service</option>
						{services?.items.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</label>
				<label>
					Target URL
					<input
						name="url"
						type="url"
						required
						maxLength={2048}
						defaultValue={existing?.url ?? ""}
					/>
				</label>
				<label>
					Expected HTTP codes
					<input
						name="codes"
						required
						pattern="[0-9, ]+"
						defaultValue={existing?.expectedCodes.join(",") ?? "200"}
					/>
				</label>
				<label>
					Failure confirmation (slots)
					<input
						name="failureThreshold"
						type="number"
						min={2}
						max={5}
						required
						defaultValue={existing?.failureThreshold ?? 2}
					/>
				</label>
				<label>
					Recovery confirmation (slots)
					<input
						name="recoveryThreshold"
						type="number"
						min={2}
						max={5}
						required
						defaultValue={existing?.recoveryThreshold ?? 2}
					/>
				</label>
				<label>
					Slow threshold (ms)
					<input
						name="slowMs"
						type="number"
						min={500}
						max={9000}
						required
						defaultValue={existing?.slowMs ?? 2000}
					/>
				</label>
				<label>
					Clear threshold (ms)
					<input
						name="clearMs"
						type="number"
						min={100}
						max={8000}
						required
						defaultValue={existing?.clearMs ?? 1000}
					/>
				</label>
				<label className="check-label">
					<input
						name="required"
						type="checkbox"
						defaultChecked={existing?.required ?? true}
					/>
					Required for service health
				</label>
				<label className="check-label">
					<input
						name="enabled"
						type="checkbox"
						defaultChecked={existing?.enabled ?? false}
						disabled={!existing?.approved}
					/>
					Enable monitor
				</label>
			</fieldset>
			{error && <p role="alert">{error}</p>}
			<button type="submit" className="primary" disabled={busy}>
				{busy ? "Saving…" : "Save monitor"}
			</button>{" "}
			<button type="button" disabled={busy} onClick={cancel}>
				Cancel monitor
			</button>
		</form>
	);
}

"use client";
import { useState } from "react";
import type { Run } from "../../lib/qa";
import {
	Field,
	ServiceSelect,
	State,
	Pager,
	useServices,
	useRead,
	useMutation,
	iso,
	type Props,
	type Page,
} from "./shared";
type Item = {
	id: string;
	run: Run;
	sourceMethod: string;
	sourceReference: string;
	receivedAt: string;
	freshness: string;
};
type Totals = {
	lastWebhookAt: string | null;
	runs: number;
	passedRuns: number;
	failedRuns: number;
	passed: number;
	failed: number;
	skipped: number;
	flaky: number;
};
export function QA({ env, csrf, write }: Props) {
	const [revision, refresh] = useState(0),
		[service, select] = useState(""),
		[suite, filterSuite] = useState(""),
		[status, filterStatus] = useState(""),
		[days, period] = useState(30),
		[cursor, page] = useState<string | null>(null),
		[asOf, setAsOf] = useState(() => Date.now() + 120000),
		[mode, choose] = useState("form");
	const inventory = useServices(env),
		q = new URLSearchParams({
			environment: env,
			limit: "20",
			start: new Date(asOf - days * 86400000).toISOString(),
			end: new Date(asOf).toISOString(),
		});
	if (service) q.set("serviceId", service);
	if (suite) q.set("suite", suite);
	if (status) q.set("status", status);
	if (cursor) q.set("cursor", cursor);
	const read = useRead<Page<Item> & { totals: Totals }>(
			"qa/runs?" + q,
			revision,
		),
		m = useMutation(csrf, () => {
			setAsOf(Date.now() + 120000);
			refresh((n) => n + 1);
			page(null);
		});
	return (
		<>
			<section className="panel ops-panel">
				<h2>QA results</h2>
				<div className="ops-filters">
					<Field label="Filter application">
						<select
							value={service}
							onChange={(e) => {
								select(e.target.value);
								page(null);
							}}
						>
							<option value="">All applications</option>
							{inventory.services?.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
					</Field>
					<Field label="Filter suite">
						<input
							value={suite}
							onChange={(e) => {
								filterSuite(e.target.value);
								page(null);
							}}
						/>
					</Field>
					<Field label="Filter status">
						<select
							value={status}
							onChange={(e) => {
								filterStatus(e.target.value);
								page(null);
							}}
						>
							<option value="">All statuses</option>
							{["passed", "failed", "error", "cancelled"].map((s) => (
								<option key={s}>{s}</option>
							))}
						</select>
					</Field>
					<Field label="Run history">
						<select
							value={days}
							onChange={(e) => {
								period(+e.target.value);
								page(null);
							}}
						>
							{[1, 7, 30, 90, 365].map((n) => (
								<option value={n} key={n}>
									{n} days
								</option>
							))}
						</select>
					</Field>
				</div>
				{!read.data ? (
					<State read={read} />
				) : (
					<>
						<p>
							{read.data.totals.runs} runs · {read.data.totals.passedRuns}{" "}
							passed runs · {read.data.totals.failedRuns} failed runs
						</p>
						<p>
							Latest signed receipt matching these filters:{" "}
							{read.data.totals.lastWebhookAt ?? "none recorded"}
						</p>
						<p>
							Cases: {read.data.totals.passed} passed ·{" "}
							{read.data.totals.failed} failed · {read.data.totals.skipped}{" "}
							skipped · {read.data.totals.flaky} flaky among executed
						</p>
						{!read.data.items.length ? (
							<p>No QA runs match this period.</p>
						) : (
							read.data.items.map(
								({
									id,
									run: r,
									sourceMethod,
									sourceReference,
									receivedAt,
									freshness,
								}) => (
									<article key={id}>
										<h3>
											{r.suiteName} · {r.status}
										</h3>
										<p>
											{inventory.services?.find((s) => s.id === r.serviceId)
												?.name ?? r.serviceId}{" "}
											· {r.environment} · {sourceMethod} · {freshness}
										</p>
										<p>
											Completed {r.completedAt} · {r.durationMs} ms · Received{" "}
											{receivedAt}
										</p>
										<p>
											{r.counts.passed} passed, {r.counts.failed} failed,{" "}
											{r.counts.skipped} skipped, {r.counts.flaky} flaky
										</p>
										<details>
											<summary>Run evidence</summary>
											<p>
												{sourceReference} · {r.sourceRunId} · Record {id}
												{r.applicationVersion && " · " + r.applicationVersion}
											</p>
											{r.failures.map((f, i) => (
												<p key={String(i)}>
													{f.testName}: {f.summary}
												</p>
											))}
											{r.evidence.map((e) => (
												<p key={e.url}>
													<a href={e.url} rel="noreferrer">
														{e.label}
													</a>
												</p>
											))}
											{r.securityFindings.map((f) => (
												<p key={f.externalId}>
													<a href={f.url} rel="noreferrer">
														{f.source} · {f.externalId} · {f.title}
													</a>{" "}
													· {f.severity}
												</p>
											))}
										</details>
									</article>
								),
							)
						)}
						<Pager cursor={cursor} next={read.data.nextCursor} change={page} />
					</>
				)}
			</section>
			{write && (
				<section className="panel ops-panel">
					<h2>Record a completed QA run</h2>
					<Field label="Entry method">
						<select value={mode} onChange={(e) => choose(e.target.value)}>
							<option value="form">Manual entry</option>
							<option value="json">Import run JSON</option>
						</select>
					</Field>
					{!inventory.services ? (
						<State read={inventory} />
					) : (
						<form
							className="metric-form"
							onSubmit={async (e) => {
								e.preventDefault();
								const f = new FormData(e.currentTarget);
								try {
									const start = mode === "form" ? iso(f.get("start")) : "",
										end = mode === "form" ? iso(f.get("end")) : "";
									const run =
										mode === "json"
											? JSON.parse(String(f.get("json")))
											: {
													schemaVersion: "1",
													serviceId: f.get("serviceId"),
													environment: env,
													sourceRunId: f.get("runId"),
													suiteName: f.get("suite"),
													startedAt: start,
													completedAt: end,
													durationMs: Date.parse(end) - Date.parse(start),
													status: f.get("status"),
													counts: Object.fromEntries(
														["passed", "failed", "skipped", "flaky"].map(
															(k) => [k, Number(f.get(k))],
														),
													),
													failures: f.get("failure")
														? [
																{
																	testName: String(f.get("suite")),
																	summary: f.get("failure"),
																},
															]
														: [],
													evidence: [],
													securityFindings: [],
												};
									if (run.environment !== env) throw Error();
									await m.save("qa/imports", "POST", {
										sourceReference: f.get("reference"),
										run,
									});
								} catch {
									m.set("Check the QA run fields and selected environment.");
								}
							}}
						>
							{mode === "json" ? (
								<Field label="Completed run JSON">
									<textarea rows={6} name="json" required />
								</Field>
							) : (
								<>
									<ServiceSelect services={inventory.services} />
									<Field label="Source run ID">
										<input name="runId" required />
									</Field>
									<Field label="Suite name">
										<input name="suite" required />
									</Field>
									<Field label="Run status">
										<select name="status">
											{["passed", "failed", "error", "cancelled"].map((s) => (
												<option key={s}>{s}</option>
											))}
										</select>
									</Field>
									{["start", "end"].map((k) => (
										<Field
											key={k}
											label={
												k === "start"
													? "Execution start (UTC)"
													: "Execution end (UTC)"
											}
										>
											<input
												type="datetime-local"
												step="any"
												name={k}
												required
											/>
										</Field>
									))}
									{["passed", "failed", "skipped", "flaky"].map((k) => (
										<Field label={k + " cases"} key={k}>
											<input name={k} type="number" min="0" required />
										</Field>
									))}
									<Field label="Failure summary">
										<textarea name="failure" />
									</Field>
								</>
							)}
							<Field label="Source reference">
								<input name="reference" required />
							</Field>
							<button type="submit" disabled={m.busy}>
								Save QA run
							</button>
						</form>
					)}
					<p role="status">{m.message}</p>
				</section>
			)}
		</>
	);
}

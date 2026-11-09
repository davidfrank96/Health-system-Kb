"use client";
import { useState } from "react";
import {
	Field,
	Pager,
	ServiceSelect,
	State,
	useServices,
	useRead,
	useMutation,
	iso,
	type Page,
	type Props,
	type Service,
} from "./shared";
type Incident = {
	id: string;
	serviceId: string;
	title: string;
	severity: string;
	status: string;
	owner: string;
	version: number;
	createdAt: string;
	startedAt: string | null;
};
type Window = {
	id: string;
	serviceId: string;
	title: string;
	reason: string;
	startsAt: string;
	endsAt: string;
	cancelledAt: string | null;
	version: number;
};
type Entry = {
	version: number;
	actor: string;
	occurredAt: string;
	recordedAt: string;
	message: string;
	status: string;
	evidence: { type: string; id?: string; url?: string; slot?: string }[];
};
function refs(f: FormData) {
	const type = f.get("type"),
		id = f.get("ref");
	return !id
		? []
		: type === "security"
			? [{ type, url: id }]
			: type === "check"
				? [{ type, id, slot: iso(f.get("slot")) }]
				: [{ type, id }];
}
function Evidence() {
	return (
		<details>
			<summary>Link supporting evidence</summary>
			<Field label="Evidence type">
				<select name="type">
					{["downtime", "metric", "qa", "check", "security"].map((t) => (
						<option key={t}>{t}</option>
					))}
				</select>
			</Field>
			<Field label="Evidence ID or approved security URL">
				<input name="ref" />
			</Field>
			<Field label="Check slot (UTC, for endpoint ID)">
				<input name="slot" type="datetime-local" step="any" />
			</Field>
		</details>
	);
}
function Timeline({
	r,
	env,
	write,
	csrf,
	reload,
}: { r: Incident; reload: () => void } & Props) {
	const [cursor, page] = useState<string | null>(null),
		read = useRead<Page<Entry>>(
			"incidents/" +
				r.id +
				"/updates?environment=" +
				env +
				(cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
			r.version,
		),
		m = useMutation(csrf, reload);
	return (
		<>
			<h4>Investigation timeline</h4>
			{read.data ? (
				<>
					{read.data.items.map((u) => (
						<article key={u.version}>
							<strong>{u.status}</strong>
							<p>{u.message}</p>
							<small>
								Staff statement · {u.occurredAt} · Author {u.actor}
							</small>
							{u.evidence.map((v, i) => (
								<p key={String(i)}>
									Related {v.type}:{" "}
									{v.url ? (
										<a href={v.url} rel="noreferrer">
											{v.url}
										</a>
									) : (
										v.id
									)}{" "}
									{v.slot}
								</p>
							))}
						</article>
					))}
					<Pager cursor={cursor} next={read.data.nextCursor} change={page} />
				</>
			) : (
				<State read={read} />
			)}
			{write && r.status !== "resolved" && (
				<form
					className="metric-form"
					onSubmit={async (e) => {
						e.preventDefault();
						const form = e.currentTarget,
							f = new FormData(form);
						try {
							if (
								await m.save(
									"incidents/" + r.id + "/updates",
									"POST",
									{
										status: f.get("status"),
										message: f.get("message"),
										occurredAt: new Date().toISOString(),
										evidence: refs(f),
									},
									r.version,
								)
							)
								form.reset();
						} catch {
							m.set("Check the evidence reference and timestamp.");
						}
					}}
				>
					<Field label="Lifecycle state">
						<select name="status" defaultValue={r.status}>
							{["investigating", "identified", "monitoring", "resolved"].map(
								(s) => (
									<option key={s}>{s}</option>
								),
							)}
						</select>
					</Field>
					<Field label="Investigation or resolution note">
						<textarea required name="message" />
					</Field>
					<Evidence />
					<button type="submit" disabled={m.busy}>
						Add update
					</button>
				</form>
			)}
			<p role="status">{m.message}</p>
		</>
	);
}
export function Maintenance({
	env,
	csrf,
	write,
	services,
	compact = false,
}: { services: Service[]; compact?: boolean } & Props) {
	const [revision, refresh] = useState(0),
		[cursor, page] = useState<string | null>(null),
		[edit, select] = useState<Window | null>(null),
		read = useRead<Page<Window>>(
			"maintenance?environment=" +
				env +
				(cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
			revision,
		);
	const m = useMutation(csrf, () => {
		refresh((n) => n + 1);
		select(null);
	});
	return (
		<section className="panel ops-panel">
			<h2>Maintenance windows</h2>
			{!read.data ? (
				<State read={read} />
			) : (
				<>
					{!read.data.items.length && <p>No scheduled maintenance records.</p>}
					{read.data.items.map((w) => (
						<article key={w.id}>
							<h3>{w.title}</h3>
							<p>
								{services.find((s) => s.id === w.serviceId)?.name ??
									w.serviceId}{" "}
								·{" "}
								{w.cancelledAt
									? "Cancelled"
									: Date.parse(w.startsAt) > Date.now()
										? "Scheduled"
										: Date.parse(w.endsAt) > Date.now()
											? "Active"
											: "Completed"}
							</p>
							<p>
								{w.startsAt} to {w.endsAt} · {w.reason}
							</p>
							{write &&
								!compact &&
								!w.cancelledAt &&
								Date.parse(w.startsAt) > Date.now() && (
									<>
										<button type="button" onClick={() => select(w)}>
											Edit {w.title}
										</button>{" "}
										<button
											type="button"
											disabled={m.busy}
											onClick={() =>
												m.save(
													"maintenance/" + w.id,
													"PATCH",
													{ cancelled: true },
													w.version,
												)
											}
										>
											Cancel {w.title}
										</button>
									</>
								)}
						</article>
					))}
					<Pager cursor={cursor} next={read.data.nextCursor} change={page} />
				</>
			)}
			{write && !compact && (
				<form
					key={edit?.id ?? "new"}
					className="metric-form"
					onSubmit={async (e) => {
						e.preventDefault();
						const form = e.currentTarget,
							f = new FormData(form);
						if (
							await m.save(
								"maintenance" + (edit ? "/" + edit.id : ""),
								edit ? "PATCH" : "POST",
								{
									environment: env,
									serviceId: edit?.serviceId ?? f.get("serviceId"),
									title: f.get("title"),
									reason: f.get("reason"),
									startsAt: iso(f.get("starts")),
									endsAt: iso(f.get("ends")),
								},
								edit?.version,
							)
						)
							form.reset();
					}}
				>
					<h3>{edit ? "Edit maintenance" : "Schedule maintenance"}</h3>
					{edit ? (
						<button type="button" onClick={() => select(null)}>
							Discard edit
						</button>
					) : (
						<ServiceSelect services={services} />
					)}
					<Field label="Maintenance title">
						<input name="title" required defaultValue={edit?.title} />
					</Field>
					<Field label="Reason and scope">
						<textarea name="reason" required defaultValue={edit?.reason} />
					</Field>
					{["starts", "ends"].map((k) => (
						<Field
							label={k === "starts" ? "Window start (UTC)" : "Window end (UTC)"}
							key={k}
						>
							<input
								type="datetime-local"
								step="any"
								name={k}
								required
								defaultValue={(k === "starts"
									? edit?.startsAt
									: edit?.endsAt
								)?.replace("Z", "")}
							/>
						</Field>
					))}
					<button type="submit" disabled={m.busy}>
						{edit ? "Save window changes" : "Schedule window"}
					</button>
				</form>
			)}
			<p role="status">{m.message}</p>
		</section>
	);
}
export function Incidents(props: Props) {
	const { env, write, csrf } = props,
		[revision, refresh] = useState(0),
		[cursor, page] = useState<string | null>(null),
		[selected, select] = useState(""),
		inventory = useServices(env),
		reload = () => refresh((n) => n + 1);
	const read = useRead<Page<Incident>>(
			"incidents?environment=" +
				env +
				(cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
			revision,
		),
		m = useMutation(csrf, reload);
	return (
		<>
			<section className="panel ops-panel">
				<h2>Operational incidents</h2>
				{!read.data ? (
					<State read={read} />
				) : (
					<>
						{!read.data.items.length && <p>No incidents recorded.</p>}
						{read.data.items.map((r) => (
							<article key={r.id}>
								<button
									type="button"
									onClick={() => select(selected === r.id ? "" : r.id)}
									aria-expanded={selected === r.id}
								>
									{r.title}
								</button>
								<p>
									{r.status} · {r.severity} ·{" "}
									{inventory.services?.find((s) => s.id === r.serviceId)
										?.name ?? r.serviceId}{" "}
									· Owner {r.owner}
								</p>
								<small>
									Created {r.createdAt} · Reported start{" "}
									{r.startedAt ?? "unknown"}
								</small>
								{selected === r.id && (
									<Timeline {...props} r={r} reload={reload} />
								)}
							</article>
						))}
						<Pager cursor={cursor} next={read.data.nextCursor} change={page} />
					</>
				)}
				{write &&
					(inventory.services ? (
						<form
							className="metric-form"
							onSubmit={async (e) => {
								e.preventDefault();
								const form = e.currentTarget,
									f = new FormData(form);
								try {
									if (
										await m.save("incidents", "POST", {
											serviceId: f.get("serviceId"),
											environment: env,
											title: f.get("title"),
											severity: f.get("severity"),
											owner: f.get("owner") || undefined,
											startedAt: f.get("started")
												? iso(f.get("started"))
												: null,
											message: f.get("message"),
											evidence: refs(f),
										})
									)
										form.reset();
								} catch {
									m.set("Check the evidence reference and timestamp.");
								}
							}}
						>
							<h3>New incident</h3>
							<ServiceSelect services={inventory.services} />
							<Field label="Incident title">
								<input name="title" required />
							</Field>
							<Field label="Severity">
								<select name="severity" defaultValue="medium">
									{["low", "medium", "high", "critical"].map((s) => (
										<option key={s}>{s}</option>
									))}
								</select>
							</Field>
							<Field label="Assigned owner">
								<input name="owner" placeholder="Defaults to reporter" />
							</Field>
							<Field label="Reported start (UTC, optional)">
								<input type="datetime-local" step="any" name="started" />
							</Field>
							<Field label="Initial report">
								<textarea name="message" required />
							</Field>
							<Evidence />
							<button type="submit" disabled={m.busy}>
								Create incident
							</button>
						</form>
					) : (
						<State read={inventory} />
					))}
				<p role="status">{m.message}</p>
			</section>
			<Maintenance {...props} services={inventory.services ?? []} />
		</>
	);
}

"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Service, ServiceInput } from "../lib/inventory";
import type { Environment } from "../lib/security";
import type { Section } from "./sections";

type Page = { items: Service[]; nextCursor: string | null };
type Props = {
	env: Environment;
	section: Section;
	admin: boolean;
	csrf: string;
};
export function Inventory({ env, section, admin, csrf }: Props) {
	const [page, setPage] = useState<Page | null>(null),
		[error, setError] = useState("");
	const [request, setRequest] = useState<{ cursor: string | null }>({
			cursor: null,
		}),
		[edit, setEdit] = useState<Service | "new" | null>(null);
	const [notice, setNotice] = useState("");
	useEffect(() => {
		const abort = new AbortController();
		setPage(null);
		setError("");
		const query = new URLSearchParams({ environment: env });
		const { cursor: after } = request;
		if (after) query.set("cursor", after);
		fetch(`/api/v1/services?${query}`, {
			cache: "no-store",
			signal: abort.signal,
		})
			.then(async (response) => {
				if (response.status === 401) {
					window.location.replace("/login");
					return;
				}
				if (!response.ok)
					throw new Error(
						response.status === 403
							? "Access denied."
							: "The service inventory could not be loaded.",
					);
				const data = await response.json();
				if (!abort.signal.aborted) setPage(data);
			})
			.catch((e) => {
				if (!abort.signal.aborted) setError(e.message);
			});
		return () => abort.abort();
	}, [env, request]);
	const { cursor } = request;
	const manage = section === "settings-integrations" && admin;
	return (
		<>
			{section === "overview" && (
				<div className="summary-grid">
					<article>
						<small>Service inventory</small>
						<strong>
							{page
								? page.items.length + (page.nextCursor || cursor ? "+" : "")
								: "—"}
						</strong>
						<span>Registered services</span>
					</article>
					<article>
						<small>Availability</small>
						<strong>Unknown</strong>
						<span>No observations recorded</span>
					</article>
					<article>
						<small>Monitoring job</small>
						<strong>Disabled</strong>
						<span>Live checks are off</span>
					</article>
				</div>
			)}
			{section === "settings-integrations" && (
				<section className="integration">
					<div>
						<h2>Provider integrations</h2>
						<p>Automatic collection is disabled for all providers.</p>
					</div>
					<span className="pill">Disabled</span>
				</section>
			)}
			<section className="panel">
				<div className="panel-head">
					<div>
						<p className="overline">{env}</p>
						<h2>Service inventory</h2>
					</div>
					{manage ? (
						<button
							className="primary"
							type="button"
							onClick={() => {
								setNotice("");
								setEdit("new");
							}}
						>
							Add service
						</button>
					) : (
						section === "overview" && (
							<Link
								className="action"
								href={`/application-status?environment=${env}`}
							>
								Application status →
							</Link>
						)
					)}
				</div>
				{edit && manage && (
					<ServiceForm
						key={edit === "new" ? "new" : edit.id}
						record={edit}
						env={env}
						csrf={csrf}
						cancel={() => setEdit(null)}
						saved={() => {
							setNotice("Service saved.");
							setEdit(null);
							setRequest({ cursor: null });
						}}
					/>
				)}
				{notice && (
					<p role="status" className="message">
						{notice}
					</p>
				)}
				{error ? (
					<div className="blank">
						<p role="alert">{error}</p>
						<button onClick={() => setRequest({ ...request })} type="button">
							Try again
						</button>
					</div>
				) : !page ? (
					<p className="blank" role="status">
						Loading service inventory…
					</p>
				) : !page.items.length ? (
					<div className="blank">
						<span className="empty-icon" aria-hidden="true">
							▤
						</span>
						<strong>No services registered</strong>
						<p>Service records for {env} will appear here.</p>
						{admin && !manage && (
							<Link
								className="action"
								href={`/settings-integrations?environment=${env}`}
							>
								Manage inventory →
							</Link>
						)}
					</div>
				) : (
					<ul className="records">
						{page.items.map((s) => (
							<li key={s.id}>
								<div>
									<strong>{s.name}</strong>
									<small>
										{s.product} · {s.owner}
									</small>
								</div>
								<span className="pill">Unknown</span>
								{manage && (
									<button
										type="button"
										aria-label={`Edit ${s.name}`}
										onClick={() => {
											setEdit(s);
											setNotice("");
										}}
									>
										Edit
									</button>
								)}
							</li>
						))}
					</ul>
				)}
				{(cursor || page?.nextCursor) && (
					<div className="pagination">
						{cursor && (
							<button
								onClick={() => setRequest({ cursor: null })}
								type="button"
							>
								First page
							</button>
						)}
						{page?.nextCursor && (
							<button
								type="button"
								onClick={() => setRequest({ cursor: page.nextCursor })}
							>
								Next page
							</button>
						)}
					</div>
				)}
			</section>
		</>
	);
}
function ServiceForm({
	record,
	env,
	csrf,
	cancel,
	saved,
}: {
	record: Service | "new";
	env: Environment;
	csrf: string;
	cancel: () => void;
	saved: () => void;
}) {
	const existing = record === "new" ? null : record;
	const [error, setError] = useState(""),
		[busy, setBusy] = useState(false);
	const [requestKey, setKey] = useState(() => crypto.randomUUID());
	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (busy) return;
		const form = new FormData(e.currentTarget);
		const body: ServiceInput = {
			environment: env,
			name: String(form.get("name")),
			product: String(form.get("product")),
			owner: String(form.get("owner")),
			criticality: form.get("criticality") as ServiceInput["criticality"],
			evidenceReference: String(form.get("evidenceReference")),
		};
		setBusy(true);
		setError("");
		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"X-CSRF-Token": csrf,
				"Idempotency-Key": requestKey,
			};
			if (existing) headers["If-Match"] = `"${existing.version}"`;
			const result = await fetch(
				`/api/v1/services${existing ? `/${existing.id}` : ""}`,
				{
					method: existing ? "PATCH" : "POST",
					headers,
					body: JSON.stringify(body),
				},
			);
			if (result.status === 401) {
				window.location.replace("/login");
				return;
			}
			if (!result.ok) {
				const { code } = await result.json();
				setError(
					code === "name_conflict"
						? "A service with this name already exists."
						: result.status === 409
							? "The record changed. Cancel and reload the inventory before editing again."
							: result.status === 403
								? "Access denied."
								: "Check the fields and try again.",
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
			<h3>{existing ? "Edit service" : "New service"}</h3>
			<fieldset disabled={busy}>
				{(
					[
						["name", "Service name"],
						["product", "Product"],
						["owner", "Service owner"],
						["evidenceReference", "Evidence reference"],
					] as const
				).map(([key, title]) => (
					<label key={key}>
						{title}
						<input
							name={key}
							maxLength={key === "evidenceReference" ? 500 : 120}
							required
							defaultValue={existing?.[key] ?? ""}
						/>
					</label>
				))}
				<label>
					Criticality
					<select
						name="criticality"
						defaultValue={existing?.criticality ?? "normal"}
					>
						{["low", "normal", "high", "critical"].map((v) => (
							<option key={v}>{v}</option>
						))}
					</select>
				</label>
			</fieldset>
			{error && <p role="alert">{error}</p>}
			<button className="primary" type="submit" disabled={busy}>
				{busy ? "Saving…" : "Save service"}
			</button>{" "}
			<button type="button" disabled={busy} onClick={cancel}>
				Cancel
			</button>
		</form>
	);
}

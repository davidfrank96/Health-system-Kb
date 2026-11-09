"use client";
import {
	useEffect,
	useRef,
	useState,
	useId,
	cloneElement,
	type ReactElement,
} from "react";
export type Props = { env: string; csrf: string; write: boolean };
export type Service = { id: string; name: string };
export type Page<T> = { items: T[]; nextCursor: string | null };
export function useRead<T>(path: string | null, revision = 0) {
	const [attempt, retry] = useState(0),
		key = JSON.stringify([path, revision, attempt]),
		[state, set] = useState<{ key: string; data?: T; error?: string }>({
			key: "",
		});
	useEffect(() => {
		if (!path) return;
		const abort = new AbortController();
		fetch("/api/v1/" + path, { signal: abort.signal, cache: "no-store" })
			.then(async (r) => {
				if (!r.ok)
					throw Error(
						r.status === 403
							? "Access denied."
							: r.status === 413
								? "Too much evidence. Select a shorter period."
								: "Evidence could not be loaded.",
					);
				const data = await r.json();
				if (!abort.signal.aborted) set({ key, data });
			})
			.catch((e) => {
				if (!abort.signal.aborted) set({ key, error: e.message });
			});
		return () => abort.abort();
	}, [key, path]);
	return {
		data: state.key === key ? state.data : undefined,
		error: state.key === key ? state.error : undefined,
		retry: () => retry((n) => n + 1),
	};
}
export function State({
	read,
}: {
	read: { error?: string; retry: () => void };
}) {
	return read.error ? (
		<div role="alert">
			{read.error}{" "}
			<button type="button" onClick={read.retry}>
				Retry
			</button>
		</div>
	) : (
		<p role="status">Loading evidence…</p>
	);
}
export function useMutation(csrf: string, onSave: () => void) {
	const [message, set] = useState(""),
		[busy, working] = useState(false),
		pending = useRef<{ fingerprint: string; key: string } | null>(null);
	async function save(
		path: string,
		method: string,
		body: unknown,
		version?: number,
	) {
		const payload = JSON.stringify(body),
			fingerprint = JSON.stringify([path, method, payload, version]);
		if (pending.current?.fingerprint !== fingerprint)
			pending.current = { fingerprint, key: crypto.randomUUID() };
		working(true);
		set("");
		try {
			const r = await fetch("/api/v1/" + path, {
				method,
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrf,
					"Idempotency-Key": pending.current.key,
					...(version ? { "If-Match": '"' + version + '"' } : {}),
				},
				body: payload,
			});
			if (!r.ok) {
				const e = await r.json();
				throw Error(
					r.status === 409
						? "Conflict. Refresh the record and review your changes."
						: (e.title ?? "Request failed."),
				);
			}
			pending.current = null;
			set("Saved.");
			onSave();
			return true;
		} catch (e) {
			set(e instanceof Error ? e.message : "Request failed.");
			return false;
		} finally {
			working(false);
		}
	}
	return { save, busy, message, set };
}
export function Field({
	label,
	children,
}: {
	label: string;
	children: ReactElement<{ id?: string }>;
}) {
	const id = useId();
	return (
		<label htmlFor={id}>
			{label}
			{cloneElement(children, { id })}
		</label>
	);
}
export function ServiceSelect({ services }: { services: Service[] }) {
	return (
		<Field label="Affected service">
			<select name="serviceId" required>
				{services.map((s) => (
					<option key={s.id} value={s.id}>
						{s.name}
					</option>
				))}
			</select>
		</Field>
	);
}
export const iso = (value: FormDataEntryValue | null) =>
	new Date(String(value) + "Z").toISOString();
export function useServices(env: string) {
	const path = "services?environment=" + env + "&limit=100";
	const [services, set] = useState<Service[] | null>(null),
		[error, fail] = useState(false),
		[attempt, retry] = useState(0);
	useEffect(() => {
		const abort = new AbortController();
		set(null);
		fail(false);
		async function load() {
			const result: Service[] = [];
			let cursor: string | null = null;
			do {
				const response: Response = await fetch(
					"/api/v1/" +
						path +
						(cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
					{ signal: abort.signal },
				);
				if (!response.ok) throw Error();
				const page: Page<Service> = await response.json();
				result.push(...page.items);
				cursor = page.nextCursor;
				if (cursor && result.length >= 2000) throw Error();
			} while (cursor);
			if (!abort.signal.aborted) set(result);
		}
		void attempt;
		load().catch(() => {
			if (!abort.signal.aborted) fail(true);
		});
		return () => abort.abort();
	}, [path, attempt]);
	return {
		services,
		error: error ? "Service inventory unavailable." : undefined,
		retry: () => retry((n) => n + 1),
	};
}
export function Pager({
	cursor,
	next,
	change,
}: {
	cursor: string | null;
	next: string | null;
	change: (s: string | null) => void;
}) {
	return (
		<div>
			{cursor && (
				<button type="button" onClick={() => change(null)}>
					First page
				</button>
			)}{" "}
			{next && (
				<button type="button" onClick={() => change(next)}>
					Next page
				</button>
			)}
		</div>
	);
}

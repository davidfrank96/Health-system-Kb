// Collector-only. Authority is supplied by the offline resource review, never by web input.
const operations = {
	droplet: {
		cpu_utilization: "cpu",
		memory_available: "memory_available",
		filesystem_free: "filesystem_free",
		load_1: "load_1",
		public_outbound_bandwidth: "bandwidth",
	},
	app: {
		app_cpu: "cpu_percentage",
		app_memory: "memory_percentage",
		app_restarts: "restart_count",
	},
};
const units = {
	cpu_utilization: "seconds",
	load_1: "load",
	filesystem_free: "bytes",
	memory_available: "bytes",
	public_outbound_bandwidth: "Mbps",
	app_cpu: "percent",
	app_memory: "percent",
	app_restarts: "count",
};
const readScopes = [
	"monitoring:read",
	"droplet:read",
	"regions:read",
	"sizes:read",
	"actions:read",
	"image:read",
	"snapshot:read",
];
export function describeCapabilities(type) {
	return Object.keys(Object.hasOwn(operations, type) ? operations[type] : {});
}
function approved(a, r, metric, now) {
	return (
		a?.enabled === true &&
		a.provider === "digitalocean" &&
		a.owner &&
		a.reviewedSource &&
		a.allowanceEvidence &&
		a.permissionEvidence &&
		a.permissionReviewed === true &&
		a.costStatus === "verified_no_incremental_cost" &&
		a.incrementalCost === 0 &&
		Date.parse(a.expiresAt) > now &&
		a.environment === r.environment &&
		a.resourceId === r.identifier &&
		a.resourceType === r.type &&
		a.component === r.component &&
		a.instance === r.instance &&
		a.metrics?.includes(metric) &&
		readScopes.every((s) => a.scopes?.includes(s)) &&
		a.scopes.every((s) =>
			[...readScopes, ...(r.type === "app" ? ["app:read"] : [])].includes(s),
		) &&
		Number.isInteger(a.maxSeries) &&
		a.maxSeries > 0 &&
		a.maxSeries <= 16
	);
}
async function boundedJson(response) {
	const reader = response.body?.getReader();
	if (!reader) throw Error();
	const chunks = [];
	let size = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > 65536) throw Error();
			chunks.push(value);
		}
		return JSON.parse(
			new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
		);
	} finally {
		await reader.cancel().catch(() => {});
	}
}
const modes = [
	"idle",
	"iowait",
	"irq",
	"nice",
	"softirq",
	"steal",
	"system",
	"user",
];
function parseMatrix(payload, r, metric, start, end, maxSeries) {
	const result = payload.data?.result;
	if (
		payload.status !== "success" ||
		payload.data.resultType !== "matrix" ||
		!Array.isArray(result) ||
		result.length > maxSeries
	)
		throw Error();
	const series = new Map();
	let partial = false;
	for (const { metric: labels, values } of result) {
		if (labels?.unit !== undefined && labels.unit !== units[metric])
			throw Error();
		if (
			!labels ||
			!Array.isArray(values) ||
			values.length > 120 ||
			!values.length
		) {
			partial = true;
			continue;
		}
		if (
			r.type === "app"
				? labels.app_uuid !== r.identifier ||
					labels.app_component !== r.component
				: labels.host_id !== r.identifier
		)
			throw Error();
		if (r.type === "app" && labels.app_component_instance !== r.instance)
			continue;
		if (metric === "filesystem_free" && labels.mountpoint !== "/") continue;
		if (
			metric === "public_outbound_bandwidth" &&
			(labels.interface !== "public" || labels.direction !== "outbound")
		)
			throw Error();
		const key = metric === "cpu_utilization" ? labels.mode : "value";
		if (series.has(key) || (!modes.includes(key) && key !== "value"))
			throw Error();
		const points = new Map();
		let previous;
		for (const [t, raw] of values) {
			if (
				!Number.isInteger(t) ||
				t < start ||
				t > end ||
				typeof raw !== "string" ||
				!/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw) ||
				!Number.isFinite(Number(raw)) ||
				t <= previous
			)
				throw Error();
			previous = t;
			points.set(t, Number(raw));
		}
		series.set(key, points);
	}
	const observations = [];
	if (metric === "cpu_utilization") {
		if (!modes.every((k) => series.has(k)))
			return { state: series.size ? "partial" : "missing", observations };
		let prev;
		for (const t of series.get("idle").keys()) {
			if (!modes.every((k) => series.get(k).has(t))) {
				prev = undefined;
				partial = true;
				continue;
			}
			if (prev !== undefined) {
				const deltas = modes.map(
						(k) => series.get(k).get(t) - series.get(k).get(prev),
					),
					total = deltas.reduce((a, b) => a + b, 0);
				if (total > 0 && deltas.every((d) => d >= 0))
					observations.push({
						time: t,
						value: (100 * (total - deltas[0])) / total,
					});
				else partial = true;
			}
			prev = t;
		}
	} else
		for (const [time, value] of series.get("value") ?? []) {
			if (
				(["app_cpu", "app_memory"].includes(metric) && value > 100) ||
				(metric === "app_restarts" && !Number.isSafeInteger(value))
			)
				throw Error();
			observations.push({ time, value });
		}
	const state = partial
		? "partial"
		: !observations.length
			? "missing"
			: Date.now() / 1000 - observations.at(-1).time > 2700
				? "stale"
				: "fresh";
	return { state, observations };
}
export async function collect({
	authority,
	resource,
	metric,
	start,
	end,
	token,
	credentialEnvironment,
	reserve,
	deadline,
	signal,
	transport = fetch,
}) {
	const empty = (state) => ({ state, observations: [] }),
		now = Date.now();
	if (!describeCapabilities(resource.type).includes(metric))
		return empty("unsupported");
	if (
		(transport === fetch &&
			(authority?.liveReadApproved !== true ||
				process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0")) ||
		!approved(authority, resource, metric, now) ||
		!token ||
		credentialEnvironment !== resource.environment ||
		!Number.isSafeInteger(deadline) ||
		deadline <= now ||
		signal?.aborted ||
		!Number.isSafeInteger(start) ||
		!Number.isSafeInteger(end) ||
		start >= end ||
		end - start > 3600 ||
		end > Math.floor(now / 1000) ||
		!(resource.type === "droplet"
			? /^[1-9]\d{0,19}$/.test(resource.identifier)
			: /^[a-f0-9-]{36}$/.test(resource.identifier) &&
				[resource.component, resource.instance].every(
					(s) => typeof s === "string" && /^[a-z0-9-]{1,63}$/.test(s),
				))
	)
		return empty("disabled");
	const url = new URL(
		"https://api.digitalocean.com/v2/monitoring/metrics/" +
			(resource.type === "app" ? "apps" : "droplet") +
			"/" +
			operations[resource.type][metric],
	);
	url.search = new URLSearchParams({
		...(resource.type === "app"
			? { app_id: resource.identifier, app_component: resource.component }
			: { host_id: resource.identifier }),
		start: String(start),
		end: String(end),
		...(metric === "public_outbound_bandwidth"
			? { interface: "public", direction: "outbound" }
			: {}),
	}).toString();
	if (!(await reserve(authority.maxSeries))) return empty("budget_exhausted");
	if (
		!approved(authority, resource, metric, Date.now()) ||
		deadline <= Date.now() ||
		signal?.aborted
	)
		return empty("disabled");
	const timeout = AbortSignal.timeout(
			Math.max(1, Math.min(5000, deadline - Date.now())),
		),
		cancel = signal ? AbortSignal.any([signal, timeout]) : timeout;
	try {
		const res = await transport(url, {
			method: "GET",
			redirect: "error",
			signal: cancel,
			headers: { Authorization: "Bearer " + token },
		});
		if (!res.ok) {
			await res.body?.cancel();
			return empty(
				[401, 403].includes(res.status)
					? "permission_denied"
					: res.status === 429
						? "rate_limited"
						: "provider_error",
			);
		}
		try {
			return parseMatrix(
				await boundedJson(res),
				resource,
				metric,
				start,
				end,
				authority.maxSeries,
			);
		} catch {
			return empty(cancel.aborted ? "timeout" : "invalid_response");
		}
	} catch {
		return empty(cancel.aborted ? "timeout" : "connection_error");
	}
}

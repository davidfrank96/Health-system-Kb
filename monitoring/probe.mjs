import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { requireApprovedTest } from "../database/connection.mjs";

export const limits = Object.freeze({
	endpoints: 20,
	attempts: 40,
	concurrency: 4,
	timeoutMs: 10_000,
	deadlineMs: 300_000,
	reserveMs: 20_000,
	bytes: 65_536,
});
const fixtureAuthorities = new WeakSet();
export function fixtureAuthority(env, urls, options = {}) {
	requireApprovedTest(env);
	if (urls.length > limits.endpoints) throw new Error("fixture_limit");
	for (const raw of urls) {
		const u = new URL(raw);
		if (
			!["http:", "https:"].includes(u.protocol) ||
			u.hostname !== "127.0.0.1" ||
			!u.port ||
			u.username ||
			u.password ||
			u.hash ||
			u.search
		)
			throw new Error("fixture_url");
	}
	const authority = Object.freeze({
		urls: Object.freeze([...urls]),
		ca: options.ca,
	});
	fixtureAuthorities.add(authority);
	return authority;
}
export function publicAddress(value) {
	if (!isIP(value) || value.includes("%")) return false;
	const address = ipaddr.parse(value);
	// Mapped, transition, documentation, special-purpose and reserved ranges fail closed.
	if (address.range() !== "unicast") return false;
	if (address.kind() === "ipv6" && !address.match(ipaddr.parseCIDR("2000::/3")))
		return false;
	return true;
}
export function canonicalTarget(raw) {
	if (typeof raw !== "string" || raw.length > 2048 || /[\s\\]/.test(raw))
		throw new Error("security_policy");
	let u;
	try {
		u = new URL(raw);
	} catch {
		throw new Error("security_policy");
	}
	if (
		u.protocol !== "https:" ||
		u.port ||
		u.username ||
		u.password ||
		u.hash ||
		u.search ||
		isIP(u.hostname.replace(/[[\]]/g, "")) ||
		!u.hostname.includes(".") ||
		u.hostname.endsWith(".")
	)
		throw new Error("security_policy");
	return u.href;
}
export async function resolveTarget(raw, approved, resolver = lookup) {
	const url = canonicalTarget(raw);
	if (!approved.includes(url)) throw new Error("security_policy");
	const u = new URL(url);
	const addresses = await resolver(u.hostname, { all: true, verbatim: true });
	if (
		!addresses.length ||
		addresses.some(
			(a) => !publicAddress(a.address) || isIP(a.address) !== a.family,
		)
	)
		throw new Error("security_policy");
	return { url: u, address: addresses[0] };
}
export function failureCategory(error) {
	if (error?.message === "security_policy") return "security_policy";
	if (error?.message === "response_limit") return "response_limit";
	if (error?.name === "TimeoutError" || error?.code === "ETIMEDOUT")
		return "timeout";
	if (["ENOTFOUND", "EAI_AGAIN", "ENODATA"].includes(error?.code)) return "dns";
	if (error?.code === "ECONNREFUSED") return "connection_refused";
	if (/CERT|TLS|SSL/.test(error?.code ?? "")) return "tls";
	if (error?.name === "AbortError") return "collector";
	return "network";
}
export const retryable = (r) =>
	["timeout", "connection_refused", "network"].includes(r.failure) ||
	(r.failure === "http_status" && [502, 503, 504].includes(r.httpStatus));

// The only request implementation: DNS lookup is replaced with the validated address.
// Original hostname remains in Host and TLS SNI; no agent reuse, redirects or proxy environment.
export async function probe(
	raw,
	expectedCodes,
	{
		signal,
		authority,
		approved = [],
		timeoutMs = limits.timeoutMs,
		resolver = lookup,
	} = {},
) {
	const started = performance.now();
	const deadline = AbortSignal.timeout(
		Math.min(limits.timeoutMs, Math.max(1, timeoutMs)),
	);
	const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
	let httpStatus = null;
	let resolved = false;
	try {
		let target, ca;
		if (fixtureAuthorities.has(authority) && authority.urls.includes(raw)) {
			target = {
				url: new URL(raw),
				address: { address: "127.0.0.1", family: 4 },
			};
			ca = authority.ca;
		} else {
			// Public callers may validate DNS, but only an offline runner can supply an exact approval.
			target = await Promise.race([
				resolveTarget(raw, approved, resolver),
				new Promise((_, reject) =>
					combined.addEventListener("abort", () => reject(combined.reason), {
						once: true,
					}),
				),
			]);
		}
		resolved = true;
		combined.throwIfAborted();
		const { url, address } = target;
		await new Promise((resolve, reject) => {
			const request = (url.protocol === "https:" ? https : http).request(
				url,
				{
					method: "GET",
					agent: false,
					signal: combined,
					rejectUnauthorized: true,
					ca,
					servername: isIP(url.hostname) ? undefined : url.hostname,
					headers: {
						"User-Agent": "Kbean-Health/1",
						Accept: "*/*",
						"Accept-Encoding": "identity",
					},
					lookup: (_host, options, cb) =>
						options.all
							? cb(null, [address])
							: cb(null, address.address, address.family),
				},
				(response) => {
					httpStatus = response.statusCode ?? null;
					let bytes = 0;
					response.on("data", (chunk) => {
						bytes += chunk.length;
						if (bytes > limits.bytes)
							request.destroy(new Error("response_limit"));
					});
					response.on("error", reject);
					response.on("end", resolve);
				},
			);
			request.on("error", reject);
			request.end();
		});
		const ok =
			expectedCodes.includes(httpStatus) &&
			!(httpStatus >= 300 && httpStatus < 400);
		return {
			outcome: ok ? "success" : "failure",
			failure: ok ? null : "http_status",
			httpStatus,
			latencyMs: Math.round(performance.now() - started),
			observedAt: new Date().toISOString(),
		};
	} catch (error) {
		const failure = combined.aborted
			? deadline.aborted
				? resolved
					? "timeout"
					: "dns"
				: "collector"
			: failureCategory(error);
		return {
			outcome: [
				"security_policy",
				"collector",
				"dns",
				"network",
				"response_limit",
			].includes(failure)
				? "unknown"
				: "failure",
			failure,
			httpStatus,
			latencyMs: Math.round(performance.now() - started),
			observedAt: new Date().toISOString(),
		};
	}
}

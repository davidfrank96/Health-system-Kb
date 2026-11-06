import { createServer } from "node:http";
import { test, expect } from "vitest";
import {
	availability,
	current,
	emptyState,
	transition,
	SLOT,
	sumAvailability,
} from "../../monitoring/model.mjs";
import {
	canonicalTarget,
	publicAddress,
	resolveTarget,
	probe,
	fixtureAuthority,
	failureCategory,
} from "../../monitoring/probe.mjs";
const env = {
	KBEAN_DB_TIER: "test",
	KBEAN_DB_NAME: "kbean_test",
	KBEAN_TEST_APPROVED: "yes",
};
const base = Date.now() - 10 * SLOT;
function observation(
	n: number,
	outcome: "success" | "failure" | "unknown",
	latencyMs = 10,
	maintenance = false,
) {
	return {
		slot: new Date(base + n * SLOT).toISOString(),
		observedAt: new Date(base + n * SLOT).toISOString(),
		outcome,
		failure: outcome === "success" ? null : "timeout",
		latencyMs,
		httpStatus: outcome === "success" ? 200 : null,
		attempts: 1,
		maintenance,
	};
}
test("confirmation uses distinct slots and two recovery successes; gaps never resolve an outage", () => {
	let s = emptyState();
	s = transition(s, observation(0, "failure")).state;
	expect(s.condition).toBe("degraded");
	let t = transition(s, observation(1, "failure"));
	expect(t.event).toBe("opened");
	s = t.state;
	s = transition(s, observation(3, "success")).state;
	expect(s.open).toBe(true);
	expect(s.gap).toBe(true);
	t = transition(s, observation(4, "success"));
	expect(t.event).toBe("resolved");
	expect(t.state.condition).toBe("healthy");
	expect(() => transition(t.state, observation(4, "success"))).toThrow(
		"nonmonotonic",
	);
});
test("unknown, missing slots and maintenance break pending failure and recovery streaks", () => {
	for (const check of [
		observation(1, "unknown"),
		observation(1, "failure", 1, true),
		observation(2, "failure"),
	]) {
		const first = transition(emptyState(), observation(0, "failure")).state;
		expect(transition(first, check).state.open).toBe(false);
	}
});
test("slow warnings require two slow samples and persist until two fast samples", () => {
	let s = transition(emptyState(), observation(0, "success", 2100)).state;
	expect(s.condition).toBe("healthy");
	s = transition(s, observation(1, "success", 2100)).state;
	expect(s.condition).toBe("degraded");
	s = transition(s, observation(2, "success", 900)).state;
	expect(s.condition).toBe("degraded");
	s = transition(s, observation(3, "success", 900)).state;
	expect(s.condition).toBe("healthy");
});
test("stale down evidence remains open, never checked and disabled are unknown", () => {
	let s = transition(emptyState(), observation(0, "failure")).state;
	s = transition(s, observation(1, "failure")).state;
	expect(current(s)).toMatchObject({ condition: "unknown", quality: "stale" });
	expect(s.open).toBe(true);
	expect(current(emptyState())).toMatchObject({
		condition: "unknown",
		quality: "missing",
	});
	expect(current(s, Date.now(), false).reason).toBe("disabled");
});
test("sample counts and weighted aggregation include failures and unknowns with zero reasons", () => {
	const a = availability({
		expected: 96,
		success: 90,
		failure: 2,
		unknown: 4,
		excluded: 3,
	});
	expect(a.coverage).toBeCloseTo(92 / 96);
	expect(a.observed).toBeCloseTo(90 / 92);
	expect(a.lower).toBe(90 / 96);
	expect(a.upper).toBe(94 / 96);
	expect(availability().reason).toBe("not_monitored");
	expect(
		sumAvailability([
			a,
			{ expected: 4, success: 0, failure: 2, unknown: 2, excluded: 0 },
		]).observed,
	).toBe(90 / 94);
	expect(() =>
		availability({
			expected: 1,
			success: 1,
			failure: 1,
			unknown: 0,
			excluded: 0,
		}),
	).toThrow();
});
test.each([
	"127.0.0.1",
	"0.0.0.0",
	"169.254.169.254",
	"10.0.0.1",
	"172.16.0.1",
	"192.168.1.1",
	"100.64.0.1",
	"192.0.2.1",
	"224.0.0.1",
	"240.0.0.1",
	"::1",
	"::ffff:127.0.0.1",
	"::ffff:8.8.8.8",
	"fe80::1",
	"fc00::1",
	"ff02::1",
	"2001:db8::1",
	"2002:7f00:1::",
	"64:ff9b::7f00:1",
])("blocks forbidden address %s", (address) =>
	expect(publicAddress(address)).toBe(false),
);
test("validates all DNS answers, public addresses and exact canonical approval", async () => {
	expect(publicAddress("8.8.8.8")).toBe(true);
	expect(publicAddress("2606:4700:4700::1111")).toBe(true);
	const resolver = async () => [
		{ address: "8.8.8.8", family: 4 },
		{ address: "127.0.0.1", family: 4 },
	];
	await expect(
		resolveTarget(
			"https://example.invalid/health",
			["https://example.invalid/health"],
			resolver,
		),
	).rejects.toThrow("security_policy");
	await expect(
		resolveTarget(
			"https://example.invalid/other",
			["https://example.invalid/health"],
			resolver,
		),
	).rejects.toThrow();
	for (const url of [
		"http://example.invalid",
		"https://user:pw@example.invalid",
		"https://example.invalid:444",
		"https://example.invalid/?token=x",
		"https://127.1",
		"https://[::1]",
		"https://example.invalid/#x",
	])
		expect(() => canonicalTarget(url)).toThrow();
});
test("actual HTTP executor bounds bytes, time, redirects and exact fixture authorization", async () => {
	let redirected = 0;
	const server = createServer((req, res) => {
		if (req.url === "/redirect") {
			res.writeHead(302, { Location: "/private" });
			res.end();
		} else if (req.url === "/private") {
			redirected++;
			res.end();
		} else if (req.url === "/large") res.end("x".repeat(65537));
		else if (req.url === "/slow") setTimeout(() => res.end(), 100);
		else {
			res.writeHead(Number(req.url?.slice(1)) || 200);
			res.end("body never stored");
		}
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const port = (server.address() as { port: number }).port;
	const urls = ["/200", "/404", "/500", "/redirect", "/large", "/slow"].map(
		(p) => `http://127.0.0.1:${port}${p}`,
	);
	const authority = fixtureAuthority(env, urls);
	try {
		for (const [i, status] of [
			[0, "success"],
			[1, "failure"],
			[2, "failure"],
			[3, "failure"],
		] as const)
			expect((await probe(urls[i], [200], { authority })).outcome).toBe(status);
		expect(redirected).toBe(0);
		expect((await probe(urls[4], [200], { authority })).failure).toBe(
			"response_limit",
		);
		expect(
			(await probe(urls[5], [200], { authority, timeoutMs: 20 })).failure,
		).toBe("timeout");
		expect((await probe(urls[0], [200])).failure).toBe("security_policy");
		expect(() =>
			fixtureAuthority({ ...env, KBEAN_DB_TIER: "development" }, urls),
		).toThrow();
	} finally {
		server.closeAllConnections();
		await new Promise<void>((r) => server.close(() => r()));
	}
});
test.each([
	["ECONNREFUSED", "connection_refused"],
	["ENOTFOUND", "dns"],
	["CERT_HAS_EXPIRED", "tls"],
	["ECONNRESET", "network"],
	["ETIMEDOUT", "timeout"],
])("redacts and classifies %s", (code, expected) =>
	expect(failureCategory({ code, message: "secret" })).toBe(expected),
);

test("TLS executor verifies certificates and hostname while using the pinned fixture address", async () => {
	const { mkdtemp, readFile, rm } = await import("node:fs/promises");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const { execFileSync } = await import("node:child_process");
	const { createServer: tlsServer } = await import("node:https");
	const dir = await mkdtemp(join(tmpdir(), "kbean-tls-"));
	try {
		execFileSync(
			"openssl",
			[
				"req",
				"-x509",
				"-newkey",
				"rsa:2048",
				"-nodes",
				"-keyout",
				join(dir, "key.pem"),
				"-out",
				join(dir, "cert.pem"),
				"-days",
				"1",
				"-subj",
				"/CN=localhost",
				"-addext",
				"subjectAltName=DNS:localhost,IP:127.0.0.1",
			],
			{ stdio: "ignore" },
		);
		const cert = await readFile(join(dir, "cert.pem"), "utf8");
		const server = tlsServer(
			{ key: await readFile(join(dir, "key.pem")), cert },
			(_req, res) => res.end(),
		);
		await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
		const url = `https://127.0.0.1:${(server.address() as { port: number }).port}/health`;
		try {
			expect(
				(
					await probe(url, [200], {
						authority: fixtureAuthority(env, [url], { ca: cert }),
					})
				).outcome,
			).toBe("success");
			expect(
				(await probe(url, [200], { authority: fixtureAuthority(env, [url]) }))
					.failure,
			).toBe("tls");
		} finally {
			server.closeAllConnections();
			await new Promise<void>((r) => server.close(() => r()));
		}
	} finally {
		await rm(dir, { recursive: true });
	}
});

test("service samples use worst required endpoint per slot instead of averaging endpoint availability", async () => {
	const { combineSamples, countSamples } = await import(
		"../../monitoring/store.mjs"
	);
	expect(combineSamples(["SSUMN", "SFSNN"])).toBe("SFUMN");
	expect(countSamples(combineSamples(["SS", "SF"]))).toMatchObject({
		expected: 2,
		success: 1,
		failure: 1,
		observed: 0.5,
	});
});

test("service precedence keeps a fresh confirmed issue visible during maintenance and missing data cannot win over down", async () => {
	const { serviceState } = await import("../../monitoring/model.mjs");
	const down = {
		...emptyState(),
		condition: "maintenance" as const,
		open: true,
		lastObserved: new Date().toISOString(),
	};
	expect(current(down, Date.now(), true, true).condition).toBe("down");
	expect(
		serviceState([
			{ required: true, condition: "maintenance", quality: "missing" },
		]).condition,
	).toBe("unknown");
	expect(
		serviceState([
			{ required: true, condition: "down", quality: "fresh" },
			{ required: true, condition: "unknown", quality: "missing" },
		]),
	).toMatchObject({ condition: "down", quality: "missing" });
	expect(
		serviceState([{ required: false, condition: "healthy", quality: "fresh" }])
			.condition,
	).toBe("unknown");
});

test("actual executor rejects mixed private DNS answers before connection and treats stalled resolution as unknown", async () => {
	const url = "https://dns-fixture.invalid/health";
	let calls = 0;
	const denied = await probe(url, [200], {
		approved: [url],
		resolver: async () => {
			calls++;
			return [
				{ address: "8.8.8.8", family: 4 },
				{ address: "127.0.0.1", family: 4 },
			];
		},
	});
	expect(denied).toMatchObject({
		outcome: "unknown",
		failure: "security_policy",
	});
	expect(calls).toBe(1);
	const stalled = await probe(url, [200], {
		approved: [url],
		timeoutMs: 20,
		resolver: () => new Promise(() => {}),
	});
	expect(stalled).toMatchObject({ outcome: "unknown", failure: "dns" });
});

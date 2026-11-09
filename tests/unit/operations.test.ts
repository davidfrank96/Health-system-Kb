import { createHmac, randomBytes } from "node:crypto";
import { expect, test } from "vitest";
import {
	qaRun,
	verifySignature,
	approvedLink,
	qaFreshness,
} from "../../apps/web/lib/qa";
const now = new Date(),
	ts = String(Math.floor(+now / 1000)),
	event = crypto.randomUUID(),
	secret = randomBytes(32),
	raw = Buffer.from('{ "message":"café" }');
const example = {
	schemaVersion: "1",
	sourceRunId: "test",
	serviceId: crypto.randomUUID(),
	environment: "staging",
	suiteName: "checkout",
	startedAt: now.toISOString(),
	completedAt: now.toISOString(),
	durationMs: 0,
	status: "failed",
	counts: { passed: 2, failed: 1, skipped: 1, flaky: 2 },
	failures: [],
	evidence: [],
	securityFindings: [],
};
test("terminal counts, evidence allowlist and freshness", () => {
	expect(qaRun.safeParse(example).success).toBe(true);
	for (const delta of [
		{ status: "passed" },
		{ counts: { ...example.counts, flaky: 4 } },
		{ durationMs: 1 },
		{ sourceMethod: "webhook" },
	])
		expect(qaRun.safeParse({ ...example, ...delta }).success).toBe(false);
	expect(
		approvedLink("https://qa.example.invalid/run/2", "qa.example.invalid"),
	).toBe(true);
	for (const u of [
		"https://qa.example.invalid.evil.org/",
		"https://user@qa.example.invalid/",
		"https://qa.example.invalid/r?token=a",
	])
		expect(approvedLink(u, "qa.example.invalid")).toBe(false);
	expect(qaFreshness("2000-01-01T00:00:00Z")).toBe("schedule unverified");
	expect(qaFreshness("2000-01-01T00:00:00Z", 60)).toBe("stale");
});
test("exact UTF-8 bytes, event identity, active key and timestamp are authenticated", () => {
	const settings = {
		source: "fixture",
		environment: "staging" as const,
		serviceIds: [example.serviceId],
		keys: [
			{
				id: "new",
				secret: secret.toString("hex"),
				from: new Date(+now - 60000).toISOString(),
				until: new Date(+now + 400000).toISOString(),
			},
		],
	};
	const h = new Headers({
		"X-Kbean-Key-Id": "new",
		"X-Kbean-Event-Id": event,
		"X-Kbean-Timestamp": ts,
		"X-Kbean-Signature":
			"v1=" +
			createHmac("sha256", secret)
				.update(ts + "." + event + ".")
				.update(raw)
				.digest("hex"),
	});
	expect(verifySignature(h, raw, settings, +now)).toBe(event);
	expect(() =>
		verifySignature(h, Buffer.concat([raw, Buffer.from(" ")]), settings, +now),
	).toThrow();
	expect(() => verifySignature(h, raw, settings, +now + 301000)).toThrow();
	h.set("X-Kbean-Key-Id", "old");
	expect(() => verifySignature(h, raw, settings, +now)).toThrow();
});
test("incident transitions, UTC report windows and spreadsheet cells", async () => {
	const { canTransition } = await import("../../apps/web/lib/operations");
	const { reportPeriod, csvCell } = await import("../../apps/web/lib/reports");
	expect(canTransition("monitoring", "resolved")).toBe(true);
	expect(canTransition("resolved", "investigating")).toBe(false);
	const start = new Date(+now - 7 * 86400000);
	start.setUTCHours(0, 0, 0, 0);
	const q = new URLSearchParams({
		kind: "weekly",
		start: start.toISOString(),
		end: new Date(+start + 7 * 86400000).toISOString(),
	});
	expect(reportPeriod(q).kind).toBe("weekly");
	q.set("kind", "daily");
	expect(() => reportPeriod(q)).toThrow();
	expect(csvCell(' =HYPERLINK("x")')).toBe('"\' =HYPERLINK(""x"")"');
	expect(csvCell("a,b")).toBe('"a,b"');
});
test("disabled webhook and both sender request budgets fail before database access", async () => {
	const { vi } = await import("vitest"),
		{ webhook } = await import("../../apps/web/lib/qa");
	vi.useFakeTimers();
	vi.setSystemTime(now);
	const send = () =>
		webhook(
			new Request("https://example.invalid", { method: "POST" }),
			new Headers(),
		);
	try {
		vi.stubEnv("KBEAN_LOCAL_FIXTURES", "0");
		await expect(send()).rejects.toMatchObject({ status: 503 });
		const secret = randomBytes(32),
			ts = String(Math.floor(+now / 1000)),
			event = crypto.randomUUID(),
			sig = createHmac("sha256", secret)
				.update(ts + "." + event + ".{}")
				.digest("hex");
		for (const [k, v] of Object.entries({
			KBEAN_LOCAL_FIXTURES: "1",
			KBEAN_DB_TIER: "test",
			KBEAN_DB_NAME: "kbean_test",
			KBEAN_QA_FIXTURE_CONFIG: JSON.stringify({
				source: "unit",
				environment: "staging",
				serviceIds: [example.serviceId],
				keys: [
					{
						id: "unit",
						secret: secret.toString("hex"),
						from: new Date(+now - 10000).toISOString(),
						until: new Date(+now + 90000).toISOString(),
					},
				],
			}),
		}))
			vi.stubEnv(k, v);
		const signed = () =>
			webhook(
				new Request("https://example.invalid", {
					method: "POST",
					body: "{}",
					headers: {
						"content-type": "application/json",
						"X-Kbean-Key-Id": "unit",
						"X-Kbean-Timestamp": ts,
						"X-Kbean-Event-Id": event,
						"X-Kbean-Signature": "v1=" + sig,
					},
				}),
				new Headers(),
			);
		for (let i = 0; i < 30; i++)
			await expect(signed()).rejects.toHaveProperty("issues");
		await expect(signed()).rejects.toMatchObject({ status: 429 });
		for (let i = 31; i < 60; i++)
			await expect(send()).rejects.toMatchObject({ status: 400 });
		await expect(send()).rejects.toMatchObject({ status: 429 });
		vi.advanceTimersByTime(60000);
		await expect(send()).rejects.toMatchObject({ status: 400 });
	} finally {
		vi.unstubAllEnvs();
		vi.useRealTimers();
	}
});

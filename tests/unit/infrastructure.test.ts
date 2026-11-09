import { test, expect } from "vitest";
import {
	collect,
	describeCapabilities,
} from "../../infrastructure/digitalocean.mjs";
import { csvHeader } from "../../infrastructure/metrics";
import { previewCsv } from "../../infrastructure/imports";
const id = crypto.randomUUID(),
	at = new Date().toISOString(),
	row = [
		id,
		"development",
		"azure",
		"normalized_ru",
		"percent",
		"max",
		"12",
		at,
		"ticket-12",
		'"reviewed, locally"',
	].join(",");
test("CSV handles quoted fields, normalization and unsafe submissions", () => {
	const preview = (r: string) =>
		previewCsv(csvHeader + "\n" + r, "development");
	expect(preview(row).readings[0].note).toBe("reviewed, locally");
	expect(preview(row).digest).toBe(
		preview(row.replace(",12,", ",12.0,")).digest,
	);
	for (const bad of [
		"=HYPERLINK",
		"https://user:pass@example.org",
		"https://cloud.google.com/x?token=x",
	])
		expect(preview(row.replace("ticket-12", bad)).invalidRows).toBe(1);
	expect(preview(row + "\n" + row).invalidRows).toBe(1);
	expect(preview(row.replace("development", "staging")).invalidRows).toBe(1);
	expect(() => preview(row.repeat(9000))).toThrow();
	expect(() => preview(row.slice(0, -1))).toThrow();
});
const end = Math.floor(Date.now() / 1000),
	resource = { environment: "development", type: "droplet", identifier: "123" },
	authority = {
		enabled: true,
		provider: "digitalocean",
		owner: "fixture",
		reviewedSource: "fixture",
		permissionReviewed: true,
		allowanceEvidence: "isolated fixture budget",
		permissionEvidence: "synthetic read-only scopes",
		costStatus: "verified_no_incremental_cost",
		incrementalCost: 0,
		expiresAt: new Date(Date.now() + 60000).toISOString(),
		environment: "development",
		resourceId: "123",
		resourceType: "droplet",
		metrics: ["load_1", "cpu_utilization"],
		maxSeries: 8,
		scopes: [
			"monitoring:read",
			"droplet:read",
			"regions:read",
			"sizes:read",
			"actions:read",
			"image:read",
			"snapshot:read",
		],
	};
const args = {
	authority,
	resource,
	metric: "load_1",
	start: end - 900,
	end,
	token: "fixture",
	credentialEnvironment: "development",
	reserve: async () => true,
	deadline: Date.now() + 60000,
};
const matrix = (result: unknown) =>
	Response.json({ status: "success", data: { resultType: "matrix", result } });
test("unapproved requests spend zero calls", async () => {
	let calls = 0;
	const transport = async () => {
		calls++;
		return matrix([]);
	};
	for (const overrides of [
		{ token: "" },
		{ resource: { ...resource, identifier: "124" } },
		{ reserve: async () => false },
		{ deadline: 0 },
		{ authority: { ...authority, enabled: false } },
		{ authority: { ...authority, allowanceEvidence: "" } },
		{ authority: { ...authority, permissionEvidence: "" } },
		{ authority: { ...authority, costStatus: "unverified" } },
		{ authority: { ...authority, expiresAt: at } },
		{ authority: { ...authority, scopes: ["write"] } },
	])
		await collect({ ...args, ...overrides, transport });
	expect(calls).toBe(0);
	expect(describeCapabilities("postgres")).toEqual([]);
});
test.each([
	[401, "permission_denied"],
	[403, "permission_denied"],
	[429, "rate_limited"],
	[503, "provider_error"],
] as const)("classifies HTTP %s", async (status, state) =>
	expect(
		(
			await collect({
				...args,
				transport: async () => new Response(null, { status }),
			})
		).state,
	).toBe(state),
);
test("verified matrix, empty, malformed and cumulative CPU with reset", async () => {
	const series = (mode: string, values: number[]) => ({
		metric: { host_id: "123", mode },
		values: values.map((v, i) => [end - 60 + i * 30, String(v)]),
	});
	const run = (result: unknown, metric = "load_1") =>
		collect({ ...args, metric, transport: async () => matrix(result) });
	expect((await run([series("", [0, 1, 2])])).observations).toHaveLength(3);
	expect((await run([])).state).toBe("missing");
	expect((await run([{}])).state).toBe("partial");
	expect(
		(await run([{ metric: { host_id: "222" }, values: [[end, "2"]] }])).state,
	).toBe("invalid_response");
	const cpu = await run(
		["idle", "iowait", "irq", "nice", "softirq", "steal", "system", "user"].map(
			(k) =>
				series(
					k,
					k === "idle" ? [2, 5, 0] : k === "user" ? [0, 1, 0] : [0, 0, 0],
				),
		),
		"cpu_utilization",
	);
	expect(cpu.state).toBe("partial");
	expect(cpu.observations).toEqual([{ time: end - 30, value: 25 }]);
});
test("adapter validates units, stale samples, exact App instance, timeout and cancellation", async () => {
	const run = (labels: Record<string, string>, time: number) =>
		collect({
			...args,
			transport: async () =>
				matrix([{ metric: labels, values: [[time, "12"]] }]),
			start: end - 3600,
		});
	expect((await run({ host_id: "123", unit: "bytes" }, end)).state).toBe(
		"invalid_response",
	);
	expect((await run({ host_id: "123" }, end - 3000)).state).toBe("stale");
	const appId = crypto.randomUUID(),
		app = {
			type: "app",
			identifier: appId,
			environment: "development",
			component: "api",
			instance: "api-0",
		};
	const result = await collect({
		...args,
		resource: app,
		authority: {
			...authority,
			resourceId: appId,
			resourceType: "app",
			component: "api",
			instance: "api-0",
			metrics: ["app_cpu"],
		},
		metric: "app_cpu",
		transport: async (url, options) => {
			expect(String(url)).toContain(
				"https://api.digitalocean.com/v2/monitoring/metrics/apps/cpu_percentage?",
			);
			expect(options?.redirect).toBe("error");
			return matrix(
				["api-1", "api-0"].map((instance, i) => ({
					metric: {
						app_uuid: appId,
						app_component: "api",
						app_component_instance: instance,
					},
					values: [[end, String(i)]],
				})),
			);
		},
	});
	expect(result.observations).toEqual([{ time: end, value: 1 }]);
	const stalled = await collect({
		...args,
		deadline: Date.now() + 40,
		transport: (_url, init) =>
			new Promise((_, reject) =>
				init?.signal?.addEventListener("abort", () =>
					reject(new Error("private diagnostic")),
				),
			),
	});
	expect(stalled.state).toBe("timeout");
});
test("CSV limits, dates, forged columns, numeric zero and invalid text", () => {
	const valid = (r: string) =>
		previewCsv(csvHeader + "\r\n" + r, "development");
	expect(valid(row.replace(",12,", ",0,")).readings[0].value).toBe(0);
	for (const bad of [
		row.replace(",12,", ",NaN,"),
		row.replace(",12,", ",101,"),
		row.replace(at, "2020-01-01T00:00:00Z"),
		row.replace(at, new Date(Date.now() + 300000).toISOString()),
		row.replace('"reviewed, locally"', "=SUM(A1:B1)"),
	])
		expect(valid(bad).invalidRows).toBe(1);
	expect(() => valid(row.replace("ticket-12", "x".repeat(4097)))).toThrow();
	expect(() => valid(Array(501).fill(row).join("\n"))).toThrow();
	expect(() =>
		previewCsv(
			csvHeader + ",source_method\n" + row + ",provider_api",
			"development",
		),
	).toThrow();
});

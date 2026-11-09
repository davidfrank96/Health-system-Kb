import { test, expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { login } from "../support/login";
import { testClient } from "../support/approved-db.mjs";
const service = process.env.KBEAN_TEST_QA_SERVICE ?? "",
	now = () => new Date().toISOString();
function synthetic(id = crypto.randomUUID()) {
	const at = new Date(Date.now() - 3 * 3600000).toISOString();
	return {
		schemaVersion: "1",
		sourceRunId: id,
		serviceId: service,
		environment: "development",
		suiteName: "Checkout smoke",
		startedAt: at,
		completedAt: at,
		durationMs: 0,
		status: "failed",
		counts: { passed: 4, failed: 1, skipped: 2, flaky: 1 },
		failures: [
			{
				testName: "Checkout confirmation",
				summary: "Synthetic confirmation timed out",
			},
		],
		evidence: [
			{ label: "QA evidence", url: "https://qa.example.invalid/runs/test" },
		],
		securityFindings: [
			{
				source: "QA tracker",
				externalId: "FIX-12",
				severity: "low",
				title: "Synthetic review reference",
				url: "https://qa.example.invalid/findings/12",
			},
		],
	};
}
async function auth(page: Page, base: string | undefined) {
	const me = await page.request.get("/api/v1/me");
	return {
		origin: base ?? new URL(page.url()).origin,
		"X-CSRF-Token": me.headers()["x-csrf-token"],
		"Idempotency-Key": crypto.randomUUID(),
	};
}
test("signed raw webhook rejects tampering, duplicates, wrong scope and oversized bodies", async ({
	request,
}) => {
	const run = synthetic(),
		bytes = JSON.stringify(run),
		event = crypto.randomUUID();
	function send(
		data: string,
		id = event,
		key = "current",
		offset = 0,
		signed = data,
	) {
		const stamp = String(Math.floor(Date.now() / 1000) + offset),
			secret =
				key === "previous"
					? process.env.KBEAN_TEST_QA_PREVIOUS
					: process.env.KBEAN_TEST_QA_SECRET;
		if (!secret) throw Error("Fixture secret missing");
		return request.post("/api/v1/webhooks/qa/runs", {
			headers: {
				"Content-Type": "application/json",
				"X-Kbean-Timestamp": stamp,
				"X-Kbean-Key-Id": key,
				"X-Kbean-Event-Id": id,
				"X-Kbean-Signature":
					"v1=" +
					createHmac("sha256", Buffer.from(secret, "hex"))
						.update(stamp + "." + id + "." + signed)
						.digest("hex"),
			},
			data,
		});
	}
	expect((await send(bytes)).status()).toBe(201);
	expect((await send(bytes, event, "previous")).status()).toBe(200);
	expect((await send(bytes + " ")).status()).toBe(409);
	expect((await send(bytes + " ", event, "current", 0, bytes)).status()).toBe(
		401,
	);
	expect((await send(bytes, event, "unknown")).status()).toBe(401);
	expect((await send(bytes, event, "current", -330)).status()).toBe(401);
	expect(
		(
			await send(
				JSON.stringify({ ...run, environment: "production" }),
				crypto.randomUUID(),
			)
		).status(),
	).toBe(403);
	expect((await send(" ".repeat(131073))).status()).toBe(413);
	const lock = await testClient("migrator"),
		retryEvent = crypto.randomUUID(),
		retryBody = JSON.stringify(synthetic());
	try {
		await lock.query("BEGIN");
		await lock.query("LOCK TABLE qa_deliveries IN ACCESS EXCLUSIVE MODE");
		expect((await send(retryBody, retryEvent)).status()).toBe(503);
	} finally {
		await lock.query("ROLLBACK");
		await lock.end();
	}
	expect((await send(retryBody, retryEvent)).status()).toBe(201);
	expect(
		(await request.get("/api/v1/qa/runs?environment=development")).status(),
	).toBe(401);
});
test("operator imports attributed QA evidence and filters stored runs and findings", async ({
	page,
}, info) => {
	await login(page, "operator");
	await page.goto("/qa-security");
	await page
		.getByRole("combobox", { name: "Entry method" })
		.selectOption("json");
	const run = synthetic();
	await page.getByLabel("Completed run JSON").fill(JSON.stringify(run));
	await page.getByLabel("Source reference").fill("QA ticket 42");
	const save = page.waitForResponse((r) => r.url().endsWith("/qa/imports"));
	await page.getByRole("button", { name: "Save QA run" }).click();
	expect((await save).status()).toBe(201);
	await page.getByLabel("Filter suite").fill("Checkout smoke");
	const item = page
		.locator("article")
		.filter({ hasText: "manual · stale" })
		.first();
	await expect(item).toBeVisible();
	await item.getByText("Run evidence").click();
	await expect(item.getByRole("link", { name: /FIX-12/ })).toBeVisible();
	await expect(
		item.getByText(/4 passed, 1 failed, 2 skipped, 1 flaky/),
	).toBeVisible();
	await page.screenshot({
		path: "docs/reports/evidence/phase-04-qa-" + info.project.name + ".png",
		fullPage: false,
	});
	await page
		.getByRole("combobox", { name: "Filter status" })
		.selectOption("passed");
	await expect(page.getByText("No QA runs match this period.")).toBeVisible();
	const findings = await page.request.get(
		"/api/v1/security/findings?environment=development",
	);
	expect((await findings.json()).items[0].finding.externalId).toBe("FIX-12");
});
test("incident history, future maintenance revisions and report CSV work in the dashboard", async ({
	page,
}, info) => {
	await login(page, "operator");
	await page.goto("/incidents-maintenance");
	const title = "Checkout investigation " + info.project.name,
		w = "Planned check " + info.project.name;
	const create = page
		.locator("form")
		.filter({ has: page.getByRole("button", { name: "Create incident" }) });
	await create.getByLabel("Affected service").selectOption(service);
	await create.getByLabel("Incident title").fill(title);
	await create
		.getByLabel("Initial report")
		.fill("Investigating a synthetic failure.");
	await create.getByRole("button", { name: "Create incident" }).click();
	await page.getByRole("button", { name: title, exact: true }).click();
	await page.getByLabel("Lifecycle state").selectOption("resolved");
	await page
		.getByLabel("Investigation or resolution note")
		.fill("Fixture replay verified recovery.");
	await page.getByRole("button", { name: "Add update" }).click();
	await expect(
		page.getByText("Fixture replay verified recovery.").first(),
	).toBeVisible();
	await page.screenshot({
		path:
			"docs/reports/evidence/phase-04-incident-" + info.project.name + ".png",
	});
	const maintenance = page
		.locator("form")
		.filter({ has: page.getByRole("button", { name: "Schedule window" }) });
	const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
	await maintenance.getByLabel("Affected service").selectOption(service);
	await maintenance.getByLabel("Maintenance title").fill(w);
	await maintenance
		.getByLabel("Reason and scope")
		.fill("Synthetic service check");
	await maintenance.getByLabel("Window start (UTC)").fill(date + "T09:00");
	await maintenance.getByLabel("Window end (UTC)").fill(date + "T10:00");
	await maintenance.getByRole("button", { name: "Schedule window" }).click();
	await page.getByRole("button", { name: "Edit " + w, exact: true }).click();
	await page.getByLabel("Reason and scope").fill("Reviewed service check");
	await page.getByRole("button", { name: "Save window changes" }).click();
	await expect(page.getByText(/Reviewed service check/).first()).toBeVisible();
	await page.getByRole("button", { name: "Cancel " + w, exact: true }).click();
	await expect(
		page
			.locator("article")
			.filter({ has: page.getByRole("heading", { name: w, exact: true }) })
			.getByText(/Cancelled/),
	).toBeVisible();
	await page.goto("/reports-history");
	for (const period of ["weekly", "monthly", "daily"]) {
		await page.getByLabel("Report period").selectOption(period);
		await expect(
			page.getByRole("button", { name: "Download private CSV" }),
		).toBeVisible();
	}
	const dl = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download private CSV" }).click();
	const path = await (await dl).path();
	if (!path) throw Error("Missing download");
	expect(await readFile(path, "utf8")).toContain(title);
	await expect(
		page.getByText("Observed availability", { exact: false }).first(),
	).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await page.screenshot({
		path: "docs/reports/evidence/phase-04-report-" + info.project.name + ".png",
		fullPage: false,
	});
	await page.setViewportSize({ width: 768, height: 1024 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
});
test("operator scope, optimistic conflicts, audited exports and viewer restrictions", async ({
	page,
	baseURL,
}) => {
	await login(page, "operator");
	const api = page.request,
		h = await auth(page, baseURL),
		data = {
			environment: "development",
			serviceId: service,
			title: "=Synthetic export cell",
			startedAt: null,
			severity: "high",
			message: "Initial evidence",
		};
	expect(
		(
			await api.post("/api/v1/incidents", {
				headers: { ...h, origin: "https://unrelated.invalid" },
				data,
			})
		).status(),
	).toBe(403);
	expect(
		(
			await api.post("/api/v1/incidents", {
				headers: h,
				data: { ...data, environment: "staging" },
			})
		).status(),
	).toBe(403);
	for (const evidence of [
		[{ type: "qa", id: crypto.randomUUID() }],
		[{ type: "security", url: "https://qa.example.invalid/findings/unknown" }],
	])
		expect(
			(
				await api.post("/api/v1/incidents", {
					headers: h,
					data: { ...data, evidence },
				})
			).status(),
		).toBe(400);
	const qa = await api.post("/api/v1/qa/imports", {
		headers: { ...h, "Idempotency-Key": crypto.randomUUID() },
		data: { sourceReference: "Incident evidence test", run: synthetic() },
	});
	expect(qa.status()).toBe(201);
	const qaId = (await qa.json()).id;
	const evidence = [
		{ type: "qa", id: qaId },
		{ type: "security", url: "https://qa.example.invalid/findings/12" },
	];
	const res = await api.post("/api/v1/incidents", {
		headers: h,
		data: { ...data, evidence },
	});
	expect(res.status()).toBe(201);
	const item = await res.json(),
		u = "/api/v1/incidents/" + item.id + "/updates";
	const timeline = await api.get(u + "?environment=development");
	expect((await timeline.json()).items[0].evidence).toEqual(evidence);
	const update = {
		message: "Verified",
		status: "identified",
		occurredAt: now(),
	};
	const both = await Promise.all(
		[1, 2].map(() =>
			api.post(u, {
				headers: {
					...h,
					"Idempotency-Key": crypto.randomUUID(),
					"If-Match": '"1"',
				},
				data: update,
			}),
		),
	);
	expect(both.map((r) => r.status()).sort()).toEqual([200, 409]);
	await login(page, "viewer");
	await page.goto("/incidents-maintenance");
	await expect(
		page.getByRole("heading", { name: "Operational incidents" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Create incident" }),
	).toHaveCount(0);
	expect(
		(
			await api.post("/api/v1/incidents", {
				headers: await auth(page, baseURL),
				data,
			})
		).status(),
	).toBe(403);
	for (const route of [
		"incidents",
		"maintenance",
		"qa/runs",
		"security/findings",
		"reports/summary",
		"reports/export",
	])
		expect(
			(await api.get("/api/v1/" + route + "?environment=production")).status(),
		).toBe(403);
	const query = new URLSearchParams({
		environment: "development",
		kind: "daily",
		start: now().slice(0, 10) + "T00:00:00.000Z",
		end: now(),
	});
	const csv = await api.get("/api/v1/reports/export?" + query);
	expect(csv.status()).toBe(200);
	expect(await csv.text()).toContain('"\'=Synthetic export cell"');
	expect(csv.headers()["cache-control"]).toContain("no-store");
	const c = await testClient("migrator");
	try {
		expect(
			(
				await c.query(
					"SELECT id FROM audit_events WHERE action='report.export' AND environment='development'",
				)
			).rowCount,
		).toBeGreaterThan(0);
	} finally {
		await c.end();
	}
});
test("QA read timeout is recoverable", async ({ page }) => {
	await login(page, "viewer");
	const c = await testClient("migrator");
	try {
		await c.query("BEGIN");
		await c.query("LOCK TABLE qa_runs IN ACCESS EXCLUSIVE MODE");
		await page.goto("/qa-security");
		await expect(page.getByText("Loading evidence…")).toBeVisible();
		await expect(
			page
				.getByRole("alert")
				.filter({ hasText: "Evidence could not be loaded." }),
		).toBeVisible({ timeout: 12000 });
	} finally {
		await c.query("ROLLBACK");
		await c.end();
	}
	await page.getByRole("button", { name: "Retry", exact: true }).click();
	await expect(page.getByText(/passed runs/)).toBeVisible();
});

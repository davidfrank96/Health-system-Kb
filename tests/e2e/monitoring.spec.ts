import { test, expect } from "@playwright/test";
import { login } from "../support/login";
import { testClient } from "../support/approved-db.mjs";
import { mkdir } from "node:fs/promises";

test("stored controlled collections drive status, history, recovery and responsive detail", async ({
	page,
}, info) => {
	await login(page, "viewer");
	await page.goto("/application-status");
	const monitor = page.getByRole("region", { name: "Application monitoring" });
	await expect(
		monitor.getByRole("button", { name: "Fixture Healthy", exact: true }),
	).toBeVisible();
	for (const [name, state] of [
		["Fixture Healthy", "healthy"],
		["Fixture Down", "down"],
		["Fixture Unknown", "unknown"],
		["Fixture Stale", "unknown"],
	]) {
		const row = monitor
			.locator(".monitor-row")
			.filter({ has: page.getByRole("button", { name, exact: true }) });
		await expect(row.locator(".health")).toHaveText(state);
	}
	await expect(
		monitor.locator(".monitor-row").filter({
			has: page.getByRole("button", { name: "Fixture Stale", exact: true }),
		}),
	).toContainText("stale");
	await monitor
		.getByRole("button", { name: "Fixture Recovered", exact: true })
		.click();
	const detail = page.getByRole("region", {
		name: "Service monitoring detail",
	});
	await expect(
		detail.getByRole("heading", { name: "15-minute sampled availability" }),
	).toBeVisible();
	await expect(detail.getByText("Recovered", { exact: true })).toBeVisible();
	await expect(detail.getByText(/2 successful · 2 failed/)).toBeVisible();
	await expect(detail.getByRole("img")).not.toHaveCount(0);
	await detail.getByLabel("History period").selectOption("90");
	await expect(detail.getByText(/2 successful · 2 failed/)).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await mkdir("output/playwright", { recursive: true });
	await detail.screenshot({
		path: `output/playwright/phase-02-${info.project.name}-detail.png`,
	});
	await page.screenshot({
		path: `output/playwright/phase-02-${info.project.name}-history.png`,
		fullPage: true,
	});
	await page.goto("/overview");
	await expect(
		page.getByText("Recent monitoring failures", { exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Application monitoring" }),
	).toContainText("completed");
});

test("admin creates a monitor, requires offline approval, edits and disables it in the real dashboard", async ({
	page,
	baseURL,
}) => {
	await login(page, "admin");
	const api = page.request;
	const csrf = (await api.get("/api/v1/me")).headers()["x-csrf-token"];
	const headers = {
		Origin: baseURL as string,
		"X-CSRF-Token": csrf,
		"Idempotency-Key": crypto.randomUUID(),
	};
	const name = `Configuration ${crypto.randomUUID()}`;
	const service = await (
		await api.post("/api/v1/services", {
			headers,
			data: {
				environment: "development",
				name,
				product: "Synthetic",
				owner: "Test",
				criticality: "normal",
				evidenceReference: "fixture",
			},
		})
	).json();
	await page.goto("/settings-integrations");
	const settings = page.getByRole("region", {
		name: "Monitoring configuration",
	});
	await settings.getByRole("button", { name: "Add monitor" }).click();
	await settings.getByLabel("Monitored service").selectOption(service.id);
	const url = `https://fixture-${crypto.randomUUID()}.invalid/health`;
	await settings.getByLabel("Target URL").fill(url);
	await expect(settings.getByLabel("Enable monitor")).toBeDisabled();
	await settings
		.getByRole("button", { name: "Save monitor", exact: true })
		.click();
	await expect(
		settings.getByText("Monitor saved.", { exact: true }),
	).toBeVisible();
	let endpoint = (
		await (
			await api.get(
				`/api/v1/endpoints?environment=development&serviceId=${service.id}`,
			)
		).json()
	).items[0];
	expect(endpoint.enabled).toBe(false);
	expect(endpoint.approved).toBe(false);
	const owner = await testClient("migrator");
	try {
		await owner.query(
			"UPDATE endpoints SET approved_url=url,approved_at=now(),approval_reference=$2,version=version+1 WHERE id=$1",
			[endpoint.id, "Browser fixture approval"],
		);
	} finally {
		await owner.end();
	}
	await settings.getByRole("button", { name: "Reload monitors" }).click();
	await settings
		.getByRole("button", { name: `Edit monitor ${url}`, exact: true })
		.click();
	await settings.getByLabel("Enable monitor").check();
	await settings
		.getByRole("button", { name: "Save monitor", exact: true })
		.click();
	await expect(
		settings.getByText("Monitor saved.", { exact: true }),
	).toBeVisible();
	endpoint = (
		await (
			await api.get(
				`/api/v1/endpoints?environment=development&serviceId=${service.id}`,
			)
		).json()
	).items[0];
	expect(endpoint.enabled).toBe(true);
	await settings
		.getByRole("button", { name: `Edit monitor ${url}`, exact: true })
		.click();
	await settings.getByLabel("Enable monitor").uncheck();
	await settings
		.getByRole("button", { name: "Save monitor", exact: true })
		.click();
	await expect(
		settings.getByText("Monitor saved.", { exact: true }),
	).toBeVisible();
	expect(
		(
			await (
				await api.get(
					`/api/v1/endpoints?environment=development&serviceId=${service.id}`,
				)
			).json()
		).items[0].enabled,
	).toBe(false);
});

test("monitor APIs enforce sessions, roles, scope, CSRF, approval, revisions, idempotency and bounded queries", async ({
	page,
	baseURL,
}) => {
	expect(
		(
			await page.request.get("/api/v1/status/overview?environment=development")
		).status(),
	).toBe(401);
	await login(page, "admin");
	const api = page.request;
	const csrf = (await api.get("/api/v1/me")).headers()["x-csrf-token"];
	const headers = {
		Origin: baseURL as string,
		"X-CSRF-Token": csrf,
		"Idempotency-Key": crypto.randomUUID(),
	};
	const serviceResponse = await api.post("/api/v1/services", {
		headers,
		data: {
			environment: "development",
			name: `Monitor API ${crypto.randomUUID()}`,
			product: "API fixture",
			owner: "Test",
			criticality: "normal",
			evidenceReference: "isolated browser fixture",
		},
	});
	expect(serviceResponse.status()).toBe(201);
	const service = await serviceResponse.json();
	const body = {
		environment: "development",
		serviceId: service.id,
		url: `https://safe-${crypto.randomUUID()}.invalid/health`,
	};
	expect((await api.post("/api/v1/endpoints", { data: body })).status()).toBe(
		403,
	);
	expect(
		(
			await api.post("/api/v1/endpoints", {
				headers,
				data: { ...body, approved: true },
			})
		).status(),
	).toBe(400);
	for (const url of [
		"http://metadata.invalid/",
		"https://127.0.0.1/",
		"https://user:password@example.invalid/",
		"https://example.invalid/?secret=x",
	])
		expect(
			(
				await api.post("/api/v1/endpoints", { headers, data: { ...body, url } })
			).status(),
		).toBe(400);
	const created = await api.post("/api/v1/endpoints", { headers, data: body });
	expect(created.status()).toBe(201);
	const record = await created.json();
	expect(
		(
			await (
				await api.post("/api/v1/endpoints", { headers, data: body })
			).json()
		).id,
	).toBe(record.id);
	expect(
		(
			await api.post("/api/v1/endpoints", {
				headers,
				data: { ...body, required: false },
			})
		).status(),
	).toBe(409);
	const patchHeaders = {
		...headers,
		"Idempotency-Key": crypto.randomUUID(),
		"If-Match": `"${record.version}"`,
	};
	expect(
		(
			await api.patch(`/api/v1/endpoints/${record.id}`, {
				headers: patchHeaders,
				data: { ...body, enabled: true },
			})
		).status(),
	).toBe(409);
	const update = await api.patch(`/api/v1/endpoints/${record.id}`, {
		headers: patchHeaders,
		data: { ...body, required: false },
	});
	expect(update.status()).toBe(200);
	expect(
		(
			await api.patch(`/api/v1/endpoints/${record.id}`, {
				headers: { ...patchHeaders, "Idempotency-Key": crypto.randomUUID() },
				data: body,
			})
		).status(),
	).toBe(409);
	expect(
		(await api.get("/api/v1/endpoints?environment=production")).status(),
	).toBe(403);
	expect(
		(
			await api.get("/api/v1/status/overview?environment=development&limit=101")
		).status(),
	).toBe(400);
	expect(
		(
			await api.get(
				"/api/v1/status/history?environment=development&serviceId=bad",
			)
		).status(),
	).toBe(400);
	const query = new URLSearchParams({
		environment: "development",
		serviceId: service.id,
		start: new Date(Date.now() - 91 * 86400000).toISOString(),
		end: new Date().toISOString(),
	});
	expect((await api.get(`/api/v1/status/history?${query}`)).status()).toBe(400);
	query.set("start", new Date(Date.now() - 7 * 86400000).toISOString());
	query.set("limit", "2");
	const history = await (
		await api.get(`/api/v1/status/history?${query}`)
	).json();
	expect(history.items.length).toBeLessThanOrEqual(2);
	query.set("cursor", "invalid");
	expect((await api.get(`/api/v1/status/history?${query}`)).status()).toBe(400);
	const owner = await testClient("migrator");
	try {
		const other = (
			await owner.query(
				"INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('production',$1,'Isolated fixture','Test','normal','fixture') RETURNING id",
				[crypto.randomUUID()],
			)
		).rows[0];
		const target = (
			await owner.query(
				"INSERT INTO endpoints(service_id,environment,url) VALUES($1,'production','https://isolated.invalid/health') RETURNING id",
				[other.id],
			)
		).rows[0];
		expect(
			(
				await api.patch(`/api/v1/endpoints/${target.id}`, {
					headers: patchHeaders,
					data: body,
				})
			).status(),
		).toBe(404);
		expect(
			(
				await api.get(
					`/api/v1/endpoints?environment=development&serviceId=${other.id}`,
				)
			).status(),
		).toBe(404);
		await owner.query(
			"UPDATE endpoints SET approved_url=url,approval_reference=$2,approved_at=now(),version=version+1 WHERE id=$1",
			[record.id, "fixture approval"],
		);
		const version = (
			await owner.query("SELECT version FROM endpoints WHERE id=$1", [
				record.id,
			])
		).rows[0].version;
		const changed = await api.patch(`/api/v1/endpoints/${record.id}`, {
			headers: {
				...patchHeaders,
				"If-Match": `"${version}"`,
				"Idempotency-Key": crypto.randomUUID(),
			},
			data: { ...body, url: "https://changed.invalid/health", enabled: false },
		});
		expect(changed.status()).toBe(200);
		expect(await changed.json()).toMatchObject({
			approved: false,
			enabled: false,
			approvalReference: null,
		});
	} finally {
		await owner.end();
	}
	for (const role of ["viewer", "operator"] as const) {
		await page.context().clearCookies();
		await login(page, role);
		const token = (await api.get("/api/v1/me")).headers()["x-csrf-token"];
		expect(
			(
				await api.post("/api/v1/endpoints", {
					headers: { ...headers, "X-CSRF-Token": token },
					data: body,
				})
			).status(),
		).toBe(403);
		await page.goto("/settings-integrations");
		await expect(page.getByRole("button", { name: "Add monitor" })).toHaveCount(
			0,
		);
	}
});

test("monitoring loading and retry recover after an actual database timeout", async ({
	page,
}) => {
	await login(page, "viewer");
	await page.goto("/infrastructure-health");
	const owner = await testClient("migrator");
	try {
		await owner.query("BEGIN");
		await owner.query("LOCK TABLE endpoints IN ACCESS EXCLUSIVE MODE");
		await page.goto("/application-status");
		await expect(page.getByText("Loading monitoring data…")).toBeVisible();
		await expect(
			page
				.getByRole("alert")
				.filter({ hasText: "Monitoring data could not be loaded." }),
		).toBeVisible({ timeout: 12000 });
	} finally {
		await owner.query("ROLLBACK");
		await owner.end();
	}
	await page.getByRole("button", { name: "Retry monitoring" }).click();
	await expect(
		page.getByRole("button", { name: "Fixture Healthy", exact: true }),
	).toBeVisible();
});

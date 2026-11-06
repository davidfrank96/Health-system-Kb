import { testClient } from "../support/approved-db.mjs";
import { expect, test } from "@playwright/test";
import { login } from "../support/login";
import { sections } from "../../apps/web/components/sections";

test("authorized staff can navigate seven private sections at the configured viewport", async ({
	page,
}) => {
	await login(page, "viewer");
	for (const section of sections) {
		await page
			.getByRole("navigation", { name: "Workspace" })
			.getByRole("link", { name: section.name, exact: true })
			.click();
		await expect(
			page.getByRole("heading", { name: section.name, exact: true }),
		).toBeVisible();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
	}
	await expect(page.getByRole("button", { name: "Add service" })).toHaveCount(
		0,
	);
	await page.goto("/overview?environment=production");
	await expect(
		page.getByRole("heading", { name: "Access denied" }),
	).toBeVisible();
});

test("administrator creates and updates an inventory record in the real app", async ({
	page,
}) => {
	await login(page, "admin");
	await page.getByRole("link", { name: "Settings & Integrations" }).click();
	const name = `Browser ${crypto.randomUUID()}`;
	await page.getByRole("button", { name: "Add service" }).click();
	for (const [label, value] of [
		["Service name", name],
		["Product", "Synthetic"],
		["Service owner", "Fixture team"],
		["Evidence reference", "fixture ticket"],
	])
		await page.getByLabel(label).fill(value);
	const created = page.waitForResponse(
		(r) =>
			r.request().method() === "POST" && r.url().endsWith("/api/v1/services"),
	);
	await page.getByRole("button", { name: "Save service" }).click();
	const result = await created;
	expect(result.status()).toBe(201);

	await expect(page.getByText("Service saved.")).toBeVisible();
	const edit = page.getByRole("button", { name: `Edit ${name}`, exact: true });
	await expect(page.getByRole("list")).toBeVisible();
	while ((await edit.count()) === 0) {
		const next = page.getByRole("button", { name: "Next page" });
		await expect(next).toBeVisible();
		const loaded = page.waitForResponse((r) =>
			r.url().includes("/api/v1/services?"),
		);
		await next.click();
		await loaded;
		await expect(page.getByRole("list")).toBeVisible();
	}
	await edit.click();
	await page.getByLabel("Service owner").fill("Updated fixture team");
	const updated = page.waitForResponse(
		(r) =>
			r.request().method() === "PATCH" && r.url().includes("/api/v1/services/"),
	);
	await page.getByRole("button", { name: "Save service" }).click();
	const response = await updated;
	expect(response.status()).toBe(200);
	const location = response.url();
	expect(await (await page.request.get(location)).json()).toMatchObject({
		owner: "Updated fixture team",
		version: 2,
	});
});
test("API validates role, cross-environment access, bad input, CSRF, duplicate keys and revisions", async ({
	page,
	baseURL,
}) => {
	await login(page, "admin");
	const api = page.request;
	const csrf = (await api.get("/api/v1/me")).headers()["x-csrf-token"];
	if (!baseURL) throw new Error("Missing test origin");
	const headers = {
		origin: baseURL,
		"X-CSRF-Token": csrf,
		"Idempotency-Key": crypto.randomUUID(),
	};
	const data = {
		name: `API ${crypto.randomUUID()}`,
		owner: "Fixture",
		product: "Synthetic",
		evidenceReference: "Ticket",
		environment: "development",
		criticality: "normal",
	};
	const path = "/api/v1/services";
	expect((await api.get(`${path}?environment=production`)).status()).toBe(403);
	expect(
		(
			await api.post(path, {
				headers: { ...headers, origin: "https://other.invalid" },
				data,
			})
		).status(),
	).toBe(403);
	expect(
		(await api.post(path, { headers, data: { ...data, extra: 1 } })).status(),
	).toBe(400);
	const create = await api.post(path, { headers, data });
	expect(create.status()).toBe(201);
	const row = await create.json();
	expect((await (await api.post(path, { headers, data })).json()).id).toBe(
		row.id,
	);
	expect(
		(
			await api.post(path, { headers, data: { ...data, name: "Conflict" } })
		).status(),
	).toBe(409);
	const item = `${path}/${row.id}`;
	expect(
		(
			await api.patch(item, {
				headers: { ...headers, "If-Match": '"99"' },
				data,
			})
		).status(),
	).toBe(409);
	expect((await api.get(item)).headers().etag).toBe('"1"');
	for (const role of ["viewer", "operator"]) {
		await login(page, role);
		const user = await api.get("/api/v1/me");
		expect(
			(
				await api.post(path, {
					headers: {
						...headers,
						"X-CSRF-Token": user.headers()["x-csrf-token"],
					},
					data,
				})
			).status(),
		).toBe(403);
	}
});
test("cross-environment record IDs are hidden and concurrent retries produce one write", async ({
	page,
	baseURL,
}) => {
	await login(page, "admin");
	const api = page.request;
	const headers = {
		origin: baseURL ?? "",
		"X-CSRF-Token": (await api.get("/api/v1/me")).headers()["x-csrf-token"],
		"Idempotency-Key": crypto.randomUUID(),
	};
	const data = {
		name: `Concurrent ${crypto.randomUUID()}`,
		owner: "Fixture",
		product: "Synthetic",
		evidenceReference: "Ticket",
		environment: "development",
		criticality: "normal",
	};
	const path = "/api/v1/services";
	const replies = await Promise.all([
		api.post(path, { headers, data }),
		api.post(path, { headers, data }),
	]);
	expect(replies.map((r) => r.status())).toEqual([201, 201]);
	const [a, b] = await Promise.all(replies.map((r) => r.json()));
	expect(a.id).toBe(b.id);
	const c = await testClient("migrator");
	try {
		const { rows } = await c.query(
			"SELECT count(*)::int AS writes FROM audit_events WHERE action='service.create' AND target=$1",
			[a.id],
		);
		expect(rows[0].writes).toBe(1);
		const other = await c.query(
			"INSERT INTO services(environment,name,owner,product,criticality,evidence_reference) VALUES('staging',$1,'Fixture','Synthetic','normal','test') RETURNING id",
			[data.name],
		);
		const hidden = `${path}/${other.rows[0].id}`;
		expect((await api.get(hidden)).status()).toBe(404);
		expect(
			(
				await api.patch(hidden, {
					headers: { ...headers, "If-Match": '"1"' },
					data,
				})
			).status(),
		).toBe(404);
		const forged = await api.post(path, {
			headers: { ...headers, "X-CSRF-Token": "invalid" },
			data,
		});
		expect(forged.status()).toBe(403);
		expect(await forged.json()).toEqual({
			status: 403,
			title: "request denied",
			code: "request_denied",
			requestId: expect.any(String),
		});
	} finally {
		await c.end();
	}
});

test("inventory shows a slow database read, recovers from the actual timeout, and reloads records", async ({
	page,
}) => {
	await login(page, "viewer");
	await page.goto("/infrastructure-health");
	const owner = await testClient("migrator");
	try {
		// Only the disposable test database is eligible. The web query has a 5s statement timeout.
		await owner.query("BEGIN");
		await owner.query("LOCK TABLE services IN ACCESS EXCLUSIVE MODE");
		// Inventory management moved to Settings when Application Status gained real monitoring.
		await page.goto("/settings-integrations");
		await expect(page.getByText("Loading service inventory…")).toBeVisible();
		await expect(
			page.getByText("The service inventory could not be loaded."),
		).toBeVisible({ timeout: 10000 });
	} finally {
		await owner.query("ROLLBACK");
		await owner.end();
	}
	const recovered = page.waitForResponse((response) =>
		response.url().includes("/api/v1/services?"),
	);
	await page.getByRole("button", { name: "Try again" }).click();
	expect((await recovered).status()).toBe(200);
	await expect(
		page.getByText("The service inventory could not be loaded."),
	).toHaveCount(0);
	await expect(
		page.getByRole("list").or(page.getByText("No services registered")),
	).toBeVisible();
});

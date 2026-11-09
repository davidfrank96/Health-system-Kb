import { test, expect } from "@playwright/test";
import { login } from "../support/login";
import { csvHeader } from "../../infrastructure/metrics";
import { testClient } from "../support/approved-db.mjs";
test("resource readings, source, history, provider filters and viewer scope", async ({
	page,
}, info) => {
	await login(page, "viewer");
	await page.getByRole("link", { name: "Infrastructure Health" }).click();
	await expect(page.getByText("Synthetic web droplet")).toBeVisible();
	await page.getByRole("button", { name: "load_1 · 0.35 load" }).click();
	await expect(page.getByText(/3 recorded samples/)).toBeVisible();
	await page.getByLabel("Observation period").selectOption("90");
	await expect(page.getByText(/daily sample means/)).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await page.screenshot({
		path: "docs/reports/evidence/phase-03-" + info.project.name + ".png",
		fullPage: true,
	});
	await page.getByLabel("Filter provider").selectOption("firebase");
	await expect(page.getByText("No infrastructure readings yet")).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Record measurements" }),
	).toHaveCount(0);
	expect(
		(
			await page.request.get("/api/v1/metrics/latest?environment=production")
		).status(),
	).toBe(403);
});
test("operator saves manual evidence, previews CSV, rejects invalid batch and confirms", async ({
	page,
}, info) => {
	await login(page, "operator");
	await page.goto("/infrastructure-health");
	await page
		.getByRole("combobox", { name: "Service", exact: true })
		.selectOption({ label: "Fixture infrastructure" });
	const id = await page
		.getByRole("combobox", { name: "Service", exact: true })
		.inputValue();
	await page
		.getByRole("combobox", { name: "Provider", exact: true })
		.selectOption("azure");
	await page
		.getByRole("combobox", { name: "Metric", exact: true })
		.selectOption("normalized_ru");
	await page.getByLabel(/Value \(/).fill("28");
	const observed = new Date(Date.now() - 2 * 86400000);
	observed.setUTCSeconds(info.project.name === "mobile" ? 45 : 15, 0);
	const at = observed.toISOString();
	await page.getByLabel("Observed at (UTC)").fill(at.slice(0, 19));
	await page.getByLabel("Source reference").fill("Ticket 3");
	await page.getByLabel("Supporting note").fill("Reviewed snapshot");
	await page.getByRole("checkbox").check();
	const save = page.waitForResponse((r) =>
		r.url().endsWith("/metrics/snapshots"),
	);
	await page.getByRole("button", { name: "Save measurement" }).click();
	expect((await save).status()).toBe(201);
	await expect(page.getByText(/azure · manual · stale/).first()).toBeVisible();
	await page.getByLabel("Entry method").selectOption("csv");
	const line = [
		id,
		"development",
		"gcp",
		"requests",
		"count",
		"sum",
		5,
		at,
		"Ticket 4",
		"Local evidence",
	].join(",");
	await page
		.getByLabel("CSV content")
		.fill(
			csvHeader + "\n" + line + "\n" + line.replace("development", "staging"),
		);
	await page.getByRole("button", { name: "Preview CSV" }).click();
	await expect(page.getByText("1 valid · 1 rejected")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Confirm import" }),
	).toBeDisabled();
	await page.getByLabel("CSV content").fill(csvHeader + "\n" + line);
	await page.getByRole("button", { name: "Preview CSV" }).click();
	await page.getByRole("button", { name: "Confirm import" }).click();
	await expect(page.getByText(/gcp · csv · stale/).first()).toBeVisible();
});
test("infrastructure timeout and retry read PostgreSQL", async ({ page }) => {
	await login(page, "viewer");
	const c = await testClient("migrator");
	try {
		await c.query("BEGIN");
		await c.query("LOCK TABLE integrations IN ACCESS EXCLUSIVE MODE");
		await page.goto("/infrastructure-health");
		await expect(
			page.getByText("Loading infrastructure readings…"),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Retry readings" }),
		).toBeVisible({ timeout: 12000 });
	} finally {
		await c.query("ROLLBACK");
		await c.end();
	}
	await page.getByRole("button", { name: "Retry readings" }).click();
	await expect(page.getByText("Synthetic web droplet")).toBeVisible();
});
test("CSV confirmation is atomic, bound to preview, scope, CSRF and retry identity", async ({
	page,
	baseURL,
}) => {
	await login(page, "operator");
	const api = page.request,
		csrf = (await api.get("/api/v1/me")).headers()["x-csrf-token"],
		env = "development";
	const services = (
			await (
				await api.get("/api/v1/services?environment=development&limit=100")
			).json()
		).items,
		id = services.find(
			(s: { name: string }) => s.name === "Fixture infrastructure",
		).id;
	const at = new Date().toISOString(),
		line = [
			id,
			env,
			"azure",
			"requests",
			"count",
			"sum",
			"8",
			at,
			"source-1",
			"Test",
		].join(","),
		data = csvHeader + "\n" + line;
	const url = "/api/v1/metrics/imports?environment=development&dryRun=",
		headers = {
			"content-type": "text/csv",
			origin: baseURL ?? "",
			"X-CSRF-Token": csrf,
			"Idempotency-Key": crypto.randomUUID(),
		};
	const preview = await api.post(url + "true", { headers, data });
	expect(preview.status()).toBe(200);
	const digest = (await preview.json()).digest;
	const confirm = (body: string, key = headers["Idempotency-Key"]) =>
		api.post(url + "false", {
			headers: {
				...headers,
				"Idempotency-Key": key,
				"X-Preview-Digest": digest,
			},
			data: body,
		});
	expect((await confirm(data.replace(",8,", ",9,"))).status()).toBe(409);
	expect(
		(await confirm(data + "\n" + line.replace(env, "staging"))).status(),
	).toBe(400);
	expect(
		(
			await api.post(url + "true", {
				headers: { ...headers, "X-CSRF-Token": "invalid" },
				data,
			})
		).status(),
	).toBe(403);
	const saved = await confirm(data);
	expect(saved.status()).toBe(200);
	expect(await (await confirm(data)).json()).toEqual(await saved.json());
	expect(
		(await (await api.post(url + "true", { headers, data })).json())
			.invalidRows,
	).toBe(1);
	await login(page, "viewer");
	const me = await api.get("/api/v1/me");
	expect(
		(
			await api.post(url + "true", {
				headers: { ...headers, "X-CSRF-Token": me.headers()["x-csrf-token"] },
				data,
			})
		).status(),
	).toBe(403);
});
test("integration disable is admin-only, revisioned, idempotent and cannot authorize a live read", async ({
	page,
	baseURL,
}) => {
	await login(page, "admin");
	const api = page.request,
		headers = {
			origin: baseURL ?? "",
			"X-CSRF-Token": (await api.get("/api/v1/me")).headers()["x-csrf-token"],
			"Idempotency-Key": crypto.randomUUID(),
		};
	const list = await api.get("/api/v1/integrations?environment=development"),
		resource = (await list.json()).items[0];
	const url = "/api/v1/integrations/" + resource.id,
		withRevision = { ...headers, "If-Match": '"' + resource.version + '"' };
	expect(
		(
			await api.patch(url, { headers: withRevision, data: { enabled: true } })
		).status(),
	).toBe(409);
	const change = await api.patch(url, {
		headers: withRevision,
		data: { enabled: false },
	});
	expect(change.status()).toBe(200);
	const result = await change.json();
	expect(result.version).toBe(resource.version + 1);
	expect(result.collectionState).toBe("disabled");
	expect(
		await (
			await api.patch(url, { headers: withRevision, data: { enabled: false } })
		).json(),
	).toEqual(result);
	expect(
		(
			await api.patch(url, {
				headers: { ...withRevision, "Idempotency-Key": crypto.randomUUID() },
				data: { enabled: false },
			})
		).status(),
	).toBe(409);
	await login(page, "operator");
	expect(
		(
			await api.patch(url, {
				headers: {
					...withRevision,
					"X-CSRF-Token": (await api.get("/api/v1/me")).headers()[
						"x-csrf-token"
					],
				},
				data: { enabled: false },
			})
		).status(),
	).toBe(403);
});
test("staff switches between staging and production and reads retained 90-day history", async ({
	page,
}, info) => {
	const owner = await testClient("migrator");
	const actor = (
		await owner.query(
			"SELECT id FROM users WHERE issuer=$1 AND email='viewer@example.invalid'",
			[process.env.KBEAN_TEST_ISSUER],
		)
	).rows[0].id;
	const name = "Synthetic archive " + info.project.name;
	try {
		await owner.query(
			"INSERT INTO memberships VALUES($1,'staging','viewer'),($1,'production','viewer')",
			[actor],
		);
		await owner.query(
			`WITH service AS (INSERT INTO services(environment,name,product,owner,criticality,evidence_reference) VALUES('staging',$2,'Test','Staff','normal','fixture') RETURNING id),
 batch AS (INSERT INTO import_batches(actor,environment,digest) VALUES($1,'staging',md5($2)||md5($2)) RETURNING id)
 INSERT INTO manual_readings(service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_method,source_reference,note,entered_by,batch_id)
 SELECT service.id,'staging','azure','normalized_ru','percent','max',17,now()-interval '40 days','manual','fixture','synthetic',$1,batch.id FROM service,batch`,
			[actor, name],
		);
		await owner.query("SELECT retain_metrics()");
		await login(page, "viewer");
		await page.goto("/infrastructure-health?environment=staging");
		await page.getByText("Archived metric series").click();
		await page
			.getByRole("button", { name: name + " · normalized_ru · manual" })
			.click();
		await expect(page.getByText(/1 recorded samples/)).toBeVisible();
		await page.getByText("View readings", { exact: true }).click();
		await expect(
			page.getByRole("paragraph").filter({ hasText: /· 17 percent/ }),
		).toBeVisible();
		await page
			.getByRole("navigation", { name: "Environment" })
			.getByRole("link", { name: "production" })
			.click();
		await expect(
			page.getByText("No infrastructure readings yet"),
		).toBeVisible();
		await expect(page.getByText("Archived metric series")).toHaveCount(0);
	} finally {
		await owner.query(
			"DELETE FROM memberships WHERE user_id=$1 AND environment IN ('staging','production')",
			[actor],
		);
		await owner.end();
	}
});

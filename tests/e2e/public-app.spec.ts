import { login } from "../support/login";
import { expect, test } from "@playwright/test";
test("the running app protects dashboard routes and APIs before a database connection", async ({
	page,
	request,
}) => {
	await page.goto("/overview");
	await expect(
		page.getByRole("heading", { name: "Staff sign in" }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Continue to sign in" }),
	).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	for (const path of [
		"/api/v1/me",
		"/api/v1/services?environment=development",
	]) {
		const response = await request.get(path);
		expect(response.status()).toBe(401);
		expect(response.headers()["cache-control"]).toContain("no-store");
		expect(await response.json()).toMatchObject({ code: "session_required" });
	}
});
test("process health distinguishes a live process from unavailable storage", async ({
	request,
}) => {
	const live = await request.get("/health/live"),
		ready = await request.get("/health/ready");
	expect(live.status()).toBe(200);
	expect(ready.status()).toBe(503);
	expect(await live.json()).toEqual({ status: "ok" });
	expect(await ready.json()).toEqual({ status: "unavailable" });
});
for (const account of ["bad-signature", "bad-nonce", "unverified", "admin"]) {
	test(`OIDC callback with synthetic ${account} identity`, async ({ page }) => {
		await login(page, account);
		const expected =
			account === "admin" ? "temporarily unavailable" : "Access denied";
		await expect(page.locator("main").getByRole("alert")).toContainText(
			expected,
		);
		expect(
			(await page.context().cookies()).some(
				(c) => c.name === "__Host-kbean_session",
			),
		).toBe(false);
	});
}

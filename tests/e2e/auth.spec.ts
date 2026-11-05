import { expect, test } from "@playwright/test";
import { testClient } from "../support/approved-db.mjs";
import { createHash } from "node:crypto";
import { login } from "../support/login";
test("anonymous requests and a forged callback fail closed", async ({
	page,
	request,
}) => {
	await page.goto("/application-status");
	await expect(page).toHaveURL(/\/login$/);
	const denied = await request.get("/api/v1/services?environment=development");
	expect(denied.status()).toBe(401);
	expect(denied.headers()["cache-control"]).toContain("no-store");
	await page.goto("/auth/callback?state=incorrect&code=made-up");
	await expect(page.locator("main").getByRole("alert")).toContainText(
		"Access denied",
	);
});
for (const account of [
	"unapproved",
	"unverified",
	"bad-nonce",
	"bad-signature",
]) {
	test(`rejects ${account} identity`, async ({ page }) => {
		await login(page, account);
		await expect(page.locator("main").getByRole("alert")).toContainText(
			"Access denied",
		);
		expect((await page.request.get("/api/v1/me")).status()).toBe(401);
	});
}
test("login issues a restricted cookie and logout revokes the original token", async ({
	page,
}) => {
	await login(page, "admin");
	await expect(
		page.getByRole("heading", { name: "Overview", exact: true }),
	).toBeVisible();
	const cookie = (await page.context().cookies()).find(
		(c) => c.name === "__Host-kbean_session",
	);
	expect(cookie).toMatchObject({
		secure: true,
		httpOnly: true,
		sameSite: "Lax",
		path: "/",
	});
	if (!cookie) throw new Error("Missing session cookie");
	const me = await page.request.get("/api/v1/me");
	expect(await me.json()).toMatchObject({ email: "admin@example.invalid" });
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page).toHaveURL(/\/login$/);
	expect(
		(
			await page.request.get("/api/v1/me", {
				headers: { Cookie: `${cookie.name}=${cookie.value}` },
			})
		).status(),
	).toBe(401);
});
for (const kind of ["idle", "absolute", "membership"]) {
	test(`${kind} invalidation prevents reuse`, async ({ page }) => {
		await login(page, "operator");
		await expect(
			page.getByRole("heading", { name: "Overview", exact: true }),
		).toBeVisible();
		const token = (await page.context().cookies()).find(
			(c) => c.name === "__Host-kbean_session",
		)?.value;
		if (!token) throw new Error("Missing session");
		const hash = createHash("sha256").update(token).digest("hex");
		const sql =
			kind === "membership"
				? "UPDATE memberships SET role=role WHERE user_id=(SELECT id FROM users WHERE issuer=$1 AND subject=$2)"
				: `UPDATE sessions SET ${kind === "idle" ? "last_seen=now()-interval '31 minutes'" : "expires_at=now()-interval '1 second'"} WHERE token_hash=$1`;
		const db = await testClient("migrator");
		try {
			await db.query(
				sql,
				kind === "membership"
					? [process.env.KBEAN_TEST_ISSUER, process.env.KBEAN_TEST_SUBJECT]
					: [hash],
			);
		} finally {
			await db.end();
		}
		expect((await page.request.get("/api/v1/me")).status()).toBe(401);
	});
}

import type { Page } from "@playwright/test";
export async function login(page: Page, account: string) {
	await page.goto("/login");
	await page.getByRole("link", { name: "Continue to sign in" }).click();
	await page.getByRole("button", { name: account, exact: true }).click();
}

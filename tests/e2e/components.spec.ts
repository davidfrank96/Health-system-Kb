import { expect, test } from "@playwright/test";
import { sections } from "../../apps/web/components/sections";
const fixture = "http://127.0.0.1:41790";
test("dashboard component navigates seven sections without page overflow", async ({
	page,
}) => {
	await page.route("**/api/v1/services?*", (r) =>
		r.fulfill({ json: { items: [], nextCursor: null } }),
	);
	await page.goto(`${fixture}/overview`);
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
});
test("inventory component handles loading, retry, empty state and a rejected edit", async ({
	page,
}) => {
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	let first = true;
	await page.route("**/api/v1/services?*", async (route) => {
		if (first) {
			first = false;
			await gate;
			await route.fulfill({
				status: 503,
				json: { code: "temporarily_unavailable" },
			});
		} else await route.fulfill({ json: { items: [], nextCursor: null } });
	});
	await page.goto(`${fixture}/settings-integrations`);
	await expect(page.getByText("Loading service inventory…")).toBeVisible();
	release();
	await expect(
		page.getByText("The service inventory could not be loaded."),
	).toBeVisible();
	await page.getByRole("button", { name: "Try again" }).click();
	await expect(page.getByText("No services registered")).toBeVisible();
	await page.route("**/api/v1/services", (r) =>
		r.fulfill({ status: 409, json: { code: "name_conflict" } }),
	);
	await page.getByRole("button", { name: "Add service" }).click();
	for (const [label, value] of [
		["Service name", "Fixture"],
		["Product", "Synthetic"],
		["Service owner", "Team"],
		["Evidence reference", "fixture reference"],
	])
		await page.getByLabel(label).fill(value);
	await page.getByRole("button", { name: "Save service" }).click();
	await expect(
		page.getByText("A service with this name already exists."),
	).toBeVisible();
});

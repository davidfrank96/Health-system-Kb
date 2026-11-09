import { defineConfig } from "@playwright/test";

const approved = process.env.KBEAN_BROWSER_DB === "approved";
const publicPort = 41789;
export default defineConfig({
	testMatch: approved
		? [
				"**/auth.spec.ts",
				"**/dashboard.spec.ts",
				"**/monitoring.spec.ts",
				"**/infrastructure.spec.ts",
				"**/operations.spec.ts",
			]
		: [
				"**/browser-isolation.spec.ts",
				"**/public-app.spec.ts",
				"**/components.spec.ts",
			],
	webServer: approved
		? undefined
		: [
				{
					command: `node tests/support/public-app.mjs ${publicPort}`,
					url: `http://127.0.0.1:${publicPort}/health/live`,
					reuseExistingServer: false,
				},
				{
					command:
						"next dev tests/components --webpack --hostname 127.0.0.1 --port 41790",
					url: "http://127.0.0.1:41790/overview",
					reuseExistingServer: false,
					env: { NEXT_TELEMETRY_DISABLED: "1" },
				},
			],
	testDir: "./tests/e2e",
	forbidOnly: true,
	retries: 0,
	workers: 1,
	timeout: 30_000,
	reporter: "list",
	use: {
		browserName: "chromium",
		baseURL: approved
			? process.env.KBEAN_TEST_ORIGIN
			: `http://127.0.0.1:${publicPort}`,
		serviceWorkers: "block",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{ name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
		{
			name: "mobile",
			use: {
				viewport: { width: 360, height: 800 },
				isMobile: true,
				hasTouch: true,
			},
		},
	],
});

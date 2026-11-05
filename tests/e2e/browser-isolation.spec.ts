import { createServer } from "node:http";
import { once } from "node:events";
import { expect, test } from "@playwright/test";

test("independent users cannot see another browser context's fixture session", async ({
	browser,
	page,
}) => {
	// Synthetic origin for this harness check only. Product specs must start the actual app.
	const server = createServer((_request, response) => {
		response
			.writeHead(200, { "Content-Type": "text/plain" })
			.end("Local browser fixture");
	});
	server.listen(0, "127.0.0.1");
	try {
		await once(server, "listening");
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing fixture port");
		const origin = `http://127.0.0.1:${address.port}`;
		await page.goto(origin);
		await page.context().addCookies([
			{
				name: "test_session",
				value: "synthetic",
				url: origin,
				httpOnly: true,
			},
		]);
		expect(
			(await page.context().cookies(origin)).map((cookie) => cookie.name),
		).toContain("test_session");
		await page.evaluate(() => localStorage.setItem("test_role", "synthetic"));
		const other = await browser.newContext();
		try {
			const otherPage = await other.newPage();
			await otherPage.goto(origin);
			expect(await other.cookies(origin)).toEqual([]);
			expect(
				await otherPage.evaluate(() => localStorage.getItem("test_role")),
			).toBeNull();
		} finally {
			await other.close();
		}
	} finally {
		server.closeAllConnections();
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
	}
});

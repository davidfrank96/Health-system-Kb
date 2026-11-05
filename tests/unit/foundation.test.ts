import { randomBytes } from "node:crypto";
import { expect, test, vi, afterEach } from "vitest";
import {
	connectionOptions,
	requireApprovedTest,
} from "../../database/connection.mjs";
import { serviceInput } from "../../apps/web/lib/inventory";
import {
	boundedBody,
	guardWrite,
	mac,
	roleFor,
	type Staff,
} from "../../apps/web/lib/security";
afterEach(() => vi.unstubAllEnvs());
const input = {
	name: "  Directory ",
	product: "Staff",
	owner: "Operations",
	criticality: "normal",
	environment: "development",
	evidenceReference: "ticket",
};
test("service validation normalizes labels and rejects unexpected fields, invalid criticality and empty owners", () => {
	expect(serviceInput.parse(input).name).toBe("Directory");
	for (const override of [
		{ enabled: true },
		{ criticality: "urgent" },
		{ owner: "  " },
		{ environment: "all" },
		{ name: "x".repeat(121) },
	])
		expect(serviceInput.safeParse({ ...input, ...override }).success).toBe(
			false,
		);
});
test("authorization grants only explicit environment membership", () => {
	const staff: Staff = {
		id: "fixture",
		email: "viewer@example.invalid",
		memberships: [{ environment: "staging", role: "viewer" }],
	};
	expect(roleFor(staff, "staging")).toBe("viewer");
	expect(() => roleFor(staff, "production")).toThrow("environment_denied");
});
test("CSRF proof binds both the origin and the current session", () => {
	vi.stubEnv("SESSION_SECRET", randomBytes(32).toString("base64"));
	vi.stubEnv("APP_ORIGIN", "https://app.example.invalid");
	vi.stubEnv("KBEAN_LOCAL_FIXTURES", "");
	vi.stubEnv("OIDC_ISSUER", "https://accounts.google.com");
	const req = (origin: string) =>
		new Request("https://app.example.invalid", { headers: { origin } });
	const token = mac("csrf", "one");
	expect(() =>
		guardWrite(req("https://app.example.invalid"), "one", token),
	).not.toThrow();
	expect(() =>
		guardWrite(req("https://other.invalid"), "one", token),
	).toThrow();
	expect(() =>
		guardWrite(req("https://app.example.invalid"), "two", token),
	).toThrow();
});
test("bounded bodies refuse oversize content and malformed UTF-8", async () => {
	const post = (body: BodyInit) =>
		new Request("https://app.example.invalid", { method: "POST", body });
	await expect(boundedBody(post("abc"), 2)).rejects.toMatchObject({
		status: 413,
	});
	await expect(boundedBody(post(new Uint8Array([255])))).rejects.toMatchObject({
		status: 400,
	});
});
test("database options refuse cloud hosts, production and incorrect identities", () => {
	const env = {
		KBEAN_DB_TIER: "test",
		KBEAN_DB_HOST: "/tmp/kbean-fixture",
		KBEAN_DB_USER: "kbean_test_web",
		KBEAN_DB_PASSWORD: "synthetic",
		KBEAN_DB_NAME: "kbean_test",
		KBEAN_TEST_APPROVED: "yes",
	};
	expect(connectionOptions(env)).toMatchObject({
		database: "kbean_test",
		host: env.KBEAN_DB_HOST,
		ssl: false,
	});
	for (const override of [
		{ KBEAN_DB_HOST: "fixture.db.ondigitalocean.com" },
		{ KBEAN_DB_TIER: "production" },
		{ KBEAN_DB_NAME: "production" },
		{ KBEAN_DB_USER: "doadmin" },
		{ KBEAN_DB_HOST: "" },
	])
		expect(() => connectionOptions({ ...env, ...override })).toThrow();
	expect(() =>
		requireApprovedTest({ ...env, KBEAN_TEST_APPROVED: "" }),
	).toThrow();
	expect(() =>
		requireApprovedTest({ ...env, KBEAN_DB_TIER: "development" }),
	).toThrow();
});

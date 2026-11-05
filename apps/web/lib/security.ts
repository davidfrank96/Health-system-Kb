import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const environment = z.enum(["development", "staging", "production"]);
export type Environment = z.infer<typeof environment>;
export type Role = "viewer" | "operator" | "admin";
export interface Staff {
	id: string;
	email: string;
	memberships: { environment: Environment; role: Role }[];
}
export const sessionName = "__Host-kbean_session";
export const flowName = "__Host-kbean_flow";
export const cookieOptions = {
	httpOnly: true,
	secure: true,
	sameSite: "lax",
	path: "/",
} as const;

export class HttpError extends Error {
	constructor(
		public status: number,
		public code: string,
	) {
		super(code);
	}
}
export function digest(value: string) {
	return createHash("sha256").update(value).digest("hex");
}
export function secret() {
	const key = Buffer.from(process.env.SESSION_SECRET ?? "", "base64");
	if (key.length !== 32) throw new Error("Session key unavailable");
	return key;
}
export function mac(purpose: string, value: string) {
	return createHmac("sha256", secret())
		.update(`${purpose}\0${value}`)
		.digest("base64url");
}
export function equal(left: string, right: string) {
	const a = Buffer.from(left),
		b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}
export function settings() {
	const origin = new URL(process.env.APP_ORIGIN ?? "");
	const issuer = new URL(
		process.env.OIDC_ISSUER ?? "https://accounts.google.com",
	);
	const local = process.env.KBEAN_LOCAL_FIXTURES === "1";
	if (
		local &&
		(!["test", "development"].includes(process.env.KBEAN_DB_TIER ?? "") ||
			process.env.KBEAN_DB_NAME !== `kbean_${process.env.KBEAN_DB_TIER}`)
	)
		throw new Error(
			"Fixture identity requires an isolated local development or test tier",
		);
	const validOrigin = origin.href === `${origin.origin}/`;
	if (
		!validOrigin ||
		(local
			? origin.protocol !== "http:" ||
				origin.hostname !== "127.0.0.1" ||
				issuer.protocol !== "http:" ||
				issuer.hostname !== "127.0.0.1" ||
				issuer.href !== `${issuer.origin}/`
			: origin.protocol !== "https:" ||
				issuer.href !== "https://accounts.google.com/")
	) {
		throw new Error("Invalid identity configuration");
	}
	return { origin: origin.origin, issuer, local };
}
export function guardWrite(
	request: Request,
	token: string,
	csrf: string | null,
) {
	if (
		!token ||
		request.headers.get("origin") !== settings().origin ||
		!equal(csrf ?? "", mac("csrf", token))
	)
		throw new HttpError(403, "request_denied");
}
export function roleFor(staff: Staff, env: Environment) {
	const membership = staff.memberships.find((m) => m.environment === env);
	if (!membership) throw new HttpError(403, "environment_denied");
	return membership.role;
}
export async function boundedBody(req: Request, max = 65536) {
	if (Number(req.headers.get("content-length")) > max)
		throw new HttpError(413, "body_too_large");
	const reader = req.body?.getReader();
	if (!reader) throw new HttpError(400, "missing_body");
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.length;
		if (size > max) {
			await reader.cancel();
			throw new HttpError(413, "body_too_large");
		}
		chunks.push(value);
	}
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(
			Buffer.concat(chunks),
		);
	} catch {
		throw new HttpError(400, "invalid_encoding");
	}
}

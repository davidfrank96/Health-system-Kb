import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import * as oidc from "openid-client";
import type { PoolClient } from "pg";
import { transaction } from "./db";
import {
	digest,
	secret,
	sessionName,
	settings,
	type Staff,
	HttpError,
} from "./security";

let discovery: Promise<oidc.Configuration> | undefined;
function provider() {
	const { issuer, local } = settings();
	const id = process.env.OIDC_CLIENT_ID,
		credential = process.env.OIDC_CLIENT_SECRET;
	if (!id || !credential) throw new Error("Identity provider unavailable");
	discovery ??= oidc
		.discovery(issuer, id, credential, undefined, {
			timeout: 5,
			execute: local
				? [oidc.allowInsecureRequests, oidc.enableNonRepudiationChecks]
				: [oidc.enableNonRepudiationChecks],
		})
		.catch((error) => {
			discovery = undefined;
			throw error;
		});
	return discovery;
}
export async function startLogin() {
	const config = await provider();
	const verifier = oidc.randomPKCECodeVerifier(),
		nonce = oidc.randomNonce(),
		state = oidc.randomState();
	const url = oidc.buildAuthorizationUrl(config, {
		redirect_uri: `${settings().origin}/auth/callback`,
		scope: "openid email",
		response_type: "code",
		code_challenge_method: "S256",
		code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
		nonce,
		state,
	});
	const flow = await new EncryptJWT({ verifier, nonce, state })
		.setProtectedHeader({ alg: "dir", enc: "A256GCM" })
		.setAudience("kbean-login")
		.setExpirationTime("5m")
		.encrypt(secret());
	return { url, flow };
}

export async function finishLogin(url: URL, cookie: string, previous?: string) {
	if (!cookie) throw new HttpError(403, "identity_denied");
	const config = await provider();
	let subject: string;
	try {
		const { payload } = await jwtDecrypt(cookie, secret(), {
			audience: "kbean-login",
			keyManagementAlgorithms: ["dir"],
			contentEncryptionAlgorithms: ["A256GCM"],
		});
		const { state, nonce, verifier } = payload;
		if (
			typeof state !== "string" ||
			typeof nonce !== "string" ||
			typeof verifier !== "string"
		)
			throw new Error();
		const tokens = await oidc.authorizationCodeGrant(config, url, {
			pkceCodeVerifier: verifier,
			expectedNonce: nonce,
			expectedState: state,
			idTokenExpected: true,
		});
		const claims = tokens.claims();
		if (claims?.email_verified !== true || !claims.sub) throw new Error();
		subject = claims.sub;
	} catch {
		throw new HttpError(403, "identity_denied");
	}
	const token = randomBytes(32).toString("base64url");
	return transaction(async (client) => {
		const user = await client.query<{ id: string }>(
			`SELECT u.id FROM users u WHERE issuer=$1 AND subject=$2 AND NOT disabled
      AND EXISTS (SELECT FROM memberships m WHERE m.user_id=u.id)`,
			[config.serverMetadata().issuer, subject],
		);
		const id = user.rows[0]?.id;
		if (!id) {
			await client.query(
				"INSERT INTO audit_events(action) VALUES ('auth.denied')",
			);
			return null;
		}
		if (previous)
			await client.query("DELETE FROM sessions WHERE token_hash=$1", [
				digest(previous),
			]);
		await client.query(
			"INSERT INTO sessions(token_hash,user_id) VALUES ($1,$2)",
			[digest(token), id],
		);
		await client.query(
			"INSERT INTO audit_events(actor,action) VALUES ($1,'auth.login')",
			[id],
		);
		return token;
	});
}
export async function staffFor(
	client: PoolClient,
	token: string,
): Promise<Staff | null> {
	if (!/^[\w-]{43}$/.test(token)) return null;
	const identity = await client.query<{ id: string; email: string }>(
		`UPDATE sessions s SET last_seen=clock_timestamp() FROM users u
    WHERE s.user_id=u.id AND NOT u.disabled AND s.token_hash=$1 AND s.expires_at>clock_timestamp()
    AND s.last_seen>clock_timestamp()-interval '30 minutes' RETURNING u.id,u.email`,
		[digest(token)],
	);
	if (!identity.rowCount) return null;
	const user = identity.rows[0];
	const memberships = await client.query<Staff["memberships"][number]>(
		"SELECT environment,role FROM memberships WHERE user_id=$1 ORDER BY environment",
		[user.id],
	);
	return memberships.rowCount
		? { ...user, memberships: memberships.rows }
		: null;
}
export async function pageIdentity() {
	const token = (await cookies()).get(sessionName)?.value ?? "";
	if (!token) return null;
	const staff = await transaction((c) => staffFor(c, token));
	return staff && { staff, token };
}

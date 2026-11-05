// Disposable loopback identity provider. This module is never imported by the app.
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

export async function startIssuer(appOrigin, clientId, clientSecret) {
	const { publicKey, privateKey } = await generateKeyPair("RS256");
	const jwk = {
		...(await exportJWK(publicKey)),
		alg: "RS256",
		use: "sig",
		kid: "local",
	};
	const flows = new Map(),
		codes = new Map();
	const redirect = `${appOrigin}/auth/callback`;
	const server = createServer(async (req, res) => {
		const url = new URL(req.url, issuer);
		const json = (data, status = 200) => {
			res.writeHead(status, {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
			});
			res.end(JSON.stringify(data));
		};
		try {
			for (const map of [flows, codes])
				for (const [id, entry] of map)
					if (entry.expires < Date.now()) map.delete(id);
			switch (url.pathname) {
				case "/.well-known/openid-configuration":
					return json({
						issuer,
						authorization_endpoint: `${issuer}/authorize`,
						token_endpoint: `${issuer}/token`,
						jwks_uri: `${issuer}/keys`,
						response_types_supported: ["code"],
						subject_types_supported: ["public"],
						id_token_signing_alg_values_supported: ["RS256"],
						code_challenge_methods_supported: ["S256"],
						token_endpoint_auth_methods_supported: ["client_secret_post"],
					});
				case "/keys":
					return json({ keys: [jwk] });
				case "/authorize": {
					const q = url.searchParams;
					if (
						q.get("redirect_uri") !== redirect ||
						q.get("client_id") !== clientId ||
						q.get("code_challenge_method") !== "S256"
					)
						return json({}, 400);
					const id = randomBytes(18).toString("hex");
					flows.set(id, {
						nonce: q.get("nonce"),
						state: q.get("state"),
						challenge: q.get("code_challenge"),
						expires: Date.now() + 60000,
					});
					res.writeHead(200, {
						"Content-Type": "text/html",
						"Cache-Control": "no-store",
						"Referrer-Policy": "same-origin",
					});
					return res.end(
						`<!doctype html><html lang="en"><title>Local test issuer</title><main><h1>Choose a synthetic account</h1><form method="post" action="/choose"><input type="hidden" name="flow" value="${id}">${["admin", "viewer", "operator", "unapproved", "unverified", "bad-nonce", "bad-signature"].map((name) => `<button name="account" value="${name}">${name}</button>`).join(" ")}</form></main></html>`,
					);
				}
				case "/choose":
				case "/token": {
					if (req.method !== "POST") return json({}, 405);
					let raw = "";
					for await (const chunk of req) {
						raw += chunk;
						if (raw.length > 8192) return json({}, 413);
					}
					const post = new URLSearchParams(raw);
					if (url.pathname === "/choose") {
						if (req.headers.origin !== issuer) return json({}, 403);
						const id = post.get("flow"),
							flow = flows.get(id);
						flows.delete(id);
						if (!flow) return json({}, 400);
						const code = randomBytes(24).toString("hex");
						codes.set(code, { ...flow, account: post.get("account") });
						const callback = new URL(redirect);
						callback.searchParams.set("code", code);
						callback.searchParams.set("state", flow.state);
						res.writeHead(303, { Location: callback.href });
						return res.end();
					}
					const code = post.get("code"),
						grant = codes.get(code);
					codes.delete(code);
					if (
						!grant ||
						post.get("client_id") !== clientId ||
						post.get("client_secret") !== clientSecret ||
						post.get("redirect_uri") !== redirect ||
						createHash("sha256")
							.update(post.get("code_verifier") ?? "")
							.digest("base64url") !== grant.challenge
					)
						return json({ error: "invalid_grant" }, 400);
					const account = grant.account;
					const bad = ["bad-nonce", "bad-signature", "unverified"].includes(
						account,
					);
					const token = await new SignJWT({
						nonce: account === "bad-nonce" ? "invalid" : grant.nonce,
						email_verified: account !== "unverified",
						email: `${bad ? "admin" : account}@example.invalid`,
					})
						.setIssuer(issuer)
						.setSubject(`${clientId}/${bad ? "admin" : account}`)
						.setAudience(clientId)
						.setIssuedAt()
						.setExpirationTime("3m")
						.setProtectedHeader({ alg: "RS256", kid: "local" })
						.sign(
							account === "bad-signature"
								? (await generateKeyPair("RS256")).privateKey
								: privateKey,
						);
					return json({
						token_type: "Bearer",
						access_token: randomBytes(32).toString("hex"),
						id_token: token,
						expires_in: 180,
					});
				}
				default:
					return json({}, 404);
			}
		} catch {
			return json({}, 500);
		}
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const issuer = `http://127.0.0.1:${server.address().port}`;
	return {
		issuer,
		close: () => {
			server.closeAllConnections();
			server.close();
		},
	};
}

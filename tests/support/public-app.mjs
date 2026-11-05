// No database settings or identity credentials are inherited by this test server.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { startIssuer } from "./issuer.mjs";
const origin = `http://127.0.0.1:${process.argv[2]}`,
	id = "kbean-local",
	credential = randomBytes(32).toString("hex");
const { issuer, close } = await startIssuer(origin, id, credential);
const app = spawn(
	"next",
	["start", "apps/web", "--hostname", "127.0.0.1", "--port", process.argv[2]],
	{
		stdio: "inherit",
		env: {
			PATH: process.env.PATH,
			NODE_ENV: "production",
			NEXT_TELEMETRY_DISABLED: "1",
			APP_ORIGIN: `http://127.0.0.1:${process.argv[2]}`,
			KBEAN_LOCAL_FIXTURES: "1",
			KBEAN_DB_TIER: "test",
			KBEAN_DB_NAME: "kbean_test",
			OIDC_ISSUER: issuer,
			OIDC_CLIENT_ID: id,
			OIDC_CLIENT_SECRET: credential,
			SESSION_SECRET: randomBytes(32).toString("base64"),
		},
	},
);
process.on("SIGTERM", () => app.kill());
process.on("SIGINT", () => app.kill());
app.on("exit", (code) => {
	close();
	process.exitCode = code ?? 0;
});

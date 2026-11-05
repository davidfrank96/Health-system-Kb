import { type NextRequest, NextResponse } from "next/server";
import { finishLogin, startLogin, staffFor } from "../../../lib/auth";
import { transaction } from "../../../lib/db";
import {
	boundedBody,
	cookieOptions,
	digest,
	flowName,
	guardWrite,
	HttpError,
	sessionName,
	settings,
} from "../../../lib/security";

type Args = { params: Promise<{ action: string }> };
function redirect(path: string) {
	return new NextResponse(null, {
		status: 303,
		headers: {
			Location: path,
			"Cache-Control": "private, no-store",
			"Referrer-Policy": "no-referrer",
		},
	});
}
export async function GET(req: NextRequest, { params }: Args) {
	const { action } = await params;
	try {
		if (action === "login") {
			const { url, flow } = await startLogin();
			const response = redirect(url.href);
			response.cookies.set(flowName, flow, { ...cookieOptions, maxAge: 300 });
			return response;
		}
		if (action !== "callback") return new Response(null, { status: 404 });
		const url = new URL(
			`/auth/callback${req.nextUrl.search}`,
			settings().origin,
		);
		const token = await finishLogin(
			url,
			req.cookies.get(flowName)?.value ?? "",
			req.cookies.get(sessionName)?.value,
		);
		const response = redirect(token ? "/overview" : "/login?reason=denied");
		response.cookies.set(flowName, "", { ...cookieOptions, maxAge: 0 });
		if (token)
			response.cookies.set(sessionName, token, {
				...cookieOptions,
				maxAge: 28800,
			});
		return response;
	} catch (e) {
		const response = redirect(
			e instanceof HttpError
				? "/login?reason=denied"
				: "/login?reason=unavailable",
		);
		response.cookies.set(flowName, "", { ...cookieOptions, maxAge: 0 });
		return response;
	}
}
export async function POST(req: NextRequest, { params }: Args) {
	if ((await params).action !== "logout")
		return new Response(null, { status: 404 });
	try {
		const token = req.cookies.get(sessionName)?.value ?? "";
		const form = new URLSearchParams(await boundedBody(req, 1024));
		guardWrite(req, token, form.get("csrf"));
		await transaction(async (c) => {
			const staff = await staffFor(c, token);
			if (staff) {
				await c.query("DELETE FROM sessions WHERE token_hash=$1", [
					digest(token),
				]);
				await c.query(
					"INSERT INTO audit_events(actor,action) VALUES ($1,'auth.logout')",
					[staff.id],
				);
			}
		});
		const response = redirect("/login");
		response.cookies.set(sessionName, "", { ...cookieOptions, maxAge: 0 });
		return response;
	} catch (e) {
		return new Response("Sign-out unavailable", {
			status: e instanceof HttpError ? e.status : 503,
		});
	}
}

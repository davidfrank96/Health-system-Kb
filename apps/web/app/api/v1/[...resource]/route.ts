import { operationsRoute } from "../../../../lib/operations";
import { webhook } from "../../../../lib/qa";
import { infrastructureRoute } from "../../../../lib/infrastructure";
import {
	endpointInput,
	saveEndpoint,
	listEndpoints,
	statusOverview,
	statusHistory,
} from "../../../../lib/monitoring";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { staffFor } from "../../../../lib/auth";
import { db, transaction } from "../../../../lib/db";
import {
	getService,
	listServices,
	saveService,
	serviceInput,
} from "../../../../lib/inventory";
import {
	boundedBody,
	environment,
	guardWrite,
	HttpError,
	mac,
	sessionName,
} from "../../../../lib/security";

export const dynamic = "force-dynamic";
type Args = { params: Promise<{ resource: string[] }> };
async function handle(req: NextRequest, { params }: Args) {
	const requestId = crypto.randomUUID();
	let actor: string | undefined;
	const headers = new Headers({
		"X-Request-Id": requestId,
		"Cache-Control": "private, no-store",
	});
	try {
		const { resource } = await params;
		const [resourceName, id] = resource;
		if (req.method === "POST" && resource.join("/") === "webhooks/qa/runs")
			return await webhook(req, headers);
		const token = req.cookies.get(sessionName)?.value ?? "";
		if (!token) throw new HttpError(401, "session_required");
		// A slow read must not hold the last_seen update lock for this session.
		// Mutations keep authorization and the write in the same transaction.
		const reader =
			req.method === "GET"
				? await transaction((c) => staffFor(c, token))
				: undefined;
		if (reader === null) throw new HttpError(401, "session_required");
		return await transaction(async (c) => {
			const staff = reader ?? (await staffFor(c, token));
			if (!staff) throw new HttpError(401, "session_required");
			actor = staff.id;
			if (
				["qa", "security", "incidents", "maintenance", "reports"].includes(
					resourceName,
				)
			)
				return operationsRoute(req, c, staff, token, resource, headers);
			if (resourceName === "metrics" || resourceName === "integrations")
				return infrastructureRoute(req, c, staff, token, resource, headers);
			if (
				resource.length === 1 &&
				resourceName === "me" &&
				req.method === "GET"
			) {
				headers.set("X-CSRF-Token", mac("csrf", token));
				return Response.json(staff, { headers });
			}
			if (
				resourceName === "status" &&
				resource.length === 2 &&
				req.method === "GET"
			) {
				const q = req.nextUrl.searchParams,
					env = environment.parse(q.get("environment"));
				const limit = z.coerce
					.number()
					.int()
					.min(1)
					.max(100)
					.parse(q.get("limit") ?? 50);
				if (id === "overview")
					return Response.json(
						await statusOverview(c, staff, env, limit, q.get("cursor")),
						{ headers },
					);
				if (id === "history")
					return Response.json(
						await statusHistory(
							c,
							staff,
							env,
							z.uuid().parse(q.get("serviceId")),
							new Date(z.iso.datetime().parse(q.get("start"))),
							new Date(z.iso.datetime().parse(q.get("end"))),
							limit,
							q.get("cursor"),
						),
						{ headers },
					);
				throw new HttpError(404, "not_found");
			}
			if (
				!["services", "endpoints"].includes(resourceName) ||
				resource.length > 2
			)
				throw new HttpError(404, "not_found");
			if (id && !z.uuid().safeParse(id).success)
				throw new HttpError(400, "invalid_id");
			if (req.method === "GET" && !id) {
				const q = req.nextUrl.searchParams;
				const env = environment.parse(q.get("environment")),
					limit = z.coerce
						.number()
						.int()
						.min(1)
						.max(100)
						.parse(q.get("limit") ?? 50);
				return Response.json(
					resourceName === "endpoints"
						? await listEndpoints(
								c,
								staff,
								env,
								limit,
								q.get("cursor"),
								q.has("serviceId") ? z.uuid().parse(q.get("serviceId")) : null,
							)
						: await listServices(c, staff, env, limit, q.get("cursor")),
					{ headers },
				);
			}
			if (req.method === "GET") {
				if (resourceName === "endpoints")
					throw new HttpError(405, "invalid_method");
				const record = await getService(c, staff, id);
				headers.set("ETag", `"${record.version}"`);
				return Response.json(record, { headers });
			}
			if ((req.method === "POST" && id) || (req.method === "PATCH" && !id))
				throw new HttpError(405, "invalid_method");
			guardWrite(req, token, req.headers.get("X-CSRF-Token"));
			const key = z
				.string()
				.regex(/^[\w-]{16,128}$/)
				.parse(req.headers.get("Idempotency-Key"));
			const revision = id
				? z
						.string()
						.regex(/^"[1-9][0-9]{0,8}"$/)
						.parse(req.headers.get("If-Match"))
				: null;
			if (req.headers.get("content-type")?.split(";")[0] !== "application/json")
				throw new HttpError(400, "expected_json");
			const raw = JSON.parse(await boundedBody(req));
			if (resourceName === "endpoints") {
				const record = await saveEndpoint(
					c,
					staff,
					endpointInput.parse(raw),
					key,
					id ?? null,
					revision,
				);
				headers.set("ETag", `"${record.version}"`);
				return Response.json(record, { status: id ? 200 : 201, headers });
			}
			const body = serviceInput.parse(raw);
			const record = await saveService(
				c,
				staff,
				body,
				key,
				id ?? null,
				revision,
			);
			headers.set("ETag", `"${record.version}"`);
			return Response.json(record, { status: id ? 200 : 201, headers });
		});
	} catch (e) {
		let status = 503,
			code = "temporarily_unavailable";
		if (e instanceof HttpError) {
			status = e.status;
			code = e.code;
		} else if (e instanceof z.ZodError || e instanceof SyntaxError) {
			status = 400;
			code = "invalid_input";
		} else if ((e as { code?: string })?.code === "23P01") {
			status = 409;
			code = "window_conflict";
		} else if ((e as { code?: string })?.code === "23505") {
			status = 409;
			code = "name_conflict";
		}
		if (status === 403 && actor) {
			try {
				await db().query(
					"INSERT INTO audit_events(actor,action) VALUES($1,$2)",
					[actor, `access.denied.${code}`],
				);
			} catch {
				status = 503;
				code = "temporarily_unavailable";
			}
		}
		headers.set("Content-Type", "application/problem+json");
		return Response.json(
			{ status, code, title: code.replaceAll("_", " "), requestId },
			{ status, headers },
		);
	}
}
export { handle as GET, handle as POST, handle as PATCH };

import { db } from "../../../lib/db";
export const dynamic = "force-dynamic";
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ probe: string }> },
) {
	const { probe } = await params;
	if (!["live", "ready"].includes(probe))
		return new Response(null, { status: 404 });
	try {
		if (probe === "ready") await db().query("SELECT id FROM services LIMIT 0");
		return Response.json({ status: "ok" });
	} catch {
		return Response.json({ status: "unavailable" }, { status: 503 });
	}
}

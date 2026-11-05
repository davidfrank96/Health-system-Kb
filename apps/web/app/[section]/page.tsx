import { notFound, redirect } from "next/navigation";
import { pageIdentity } from "../../lib/auth";
import { mac } from "../../lib/security";
import { DashboardView } from "../../components/dashboard";
import { sections } from "../../components/sections";

export const dynamic = "force-dynamic";
export default async function Dashboard({
	params,
	searchParams,
}: {
	params: Promise<{ section: string }>;
	searchParams: Promise<{ environment?: string }>;
}) {
	const [{ section }, { environment }] = await Promise.all([
		params,
		searchParams,
	]);
	const active = sections.find((s) => s.slug === section);
	if (!active) notFound();
	const identity = await pageIdentity();
	if (!identity) redirect("/login");
	const { staff, token } = identity;
	const membership = environment
		? staff.memberships.find((m) => m.environment === environment)
		: staff.memberships[0];
	return (
		<DashboardView
			active={active}
			staff={staff}
			membership={membership}
			csrf={mac("csrf", token)}
		/>
	);
}

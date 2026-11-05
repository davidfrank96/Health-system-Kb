// Component fixture in a separate Next project. The product has no fixture route.
import { notFound } from "next/navigation";
import { DashboardView } from "../../../../apps/web/components/dashboard";
import { sections } from "../../../../apps/web/components/sections";
import type { Staff } from "../../../../apps/web/lib/security";
export default async function Fixture({
	params,
}: {
	params: Promise<{ section: string }>;
}) {
	const { section } = await params,
		active = sections.find((s) => s.slug === section);
	if (!active) notFound();
	const staff: Staff = {
		id: "fixture",
		email: "admin@example.invalid",
		memberships: [{ environment: "development", role: "admin" }],
	};
	return (
		<DashboardView
			active={active}
			staff={staff}
			membership={staff.memberships[0]}
			csrf="synthetic"
		/>
	);
}

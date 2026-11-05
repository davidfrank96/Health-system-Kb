export const sections = [
	{
		slug: "overview",
		name: "Overview",
		icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
	},
	{
		slug: "application-status",
		name: "Application Status",
		icon: "M3 12h5l3-8 3 16 3-8h4",
	},
	{
		slug: "infrastructure-health",
		name: "Infrastructure Health",
		icon: "M4 4h16v6H4z M4 14h16v6H4z M7 7h2 M7 17h2",
	},
	{
		slug: "qa-security",
		name: "QA & Security",
		icon: "M12 2 4 5v6q0 7 8 11 8-4 8-11V5z M8 12l3 3 5-6",
	},
	{
		slug: "incidents-maintenance",
		name: "Incidents & Maintenance",
		icon: "M12 3 2 20h20z M12 9v5 M12 16v1",
	},
	{
		slug: "reports-history",
		name: "Reports & History",
		icon: "M5 3h10l4 4v14H5z M8 12h8 M8 16h6",
	},
	{
		slug: "settings-integrations",
		name: "Settings & Integrations",
		icon: "M3 7h8 M16 7h5 M3 17h3 M11 17h10 M11 4h5v6h-5z M6 14h5v6H6z",
	},
] as const;
export type Section = (typeof sections)[number]["slug"];

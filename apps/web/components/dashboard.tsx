import Link from "next/link";
import type { Staff } from "../lib/security";
import { Brand } from "./brand";
import { sections } from "./sections";
import { Inventory } from "./inventory";
const empty = {
	"infrastructure-health": [
		"Infrastructure readings",
		"No infrastructure readings yet",
		"Provider integrations are disabled. No resource metrics have been collected.",
	],
	"qa-security": [
		"QA results",
		"No QA results yet",
		"Test runs and security findings will appear here once an approved source supplies evidence.",
	],
	"incidents-maintenance": [
		"Incident timeline",
		"No incident history yet",
		"Incident and maintenance tracking is scheduled for a later phase.",
	],
	"reports-history": [
		"Report archive",
		"No reports yet",
		"Historical reports require recorded observations.",
	],
} as const;
export function DashboardView({
	active,
	staff,
	membership,
	csrf,
}: {
	active: (typeof sections)[number];
	staff: Staff;
	membership?: Staff["memberships"][number];
	csrf: string;
}) {
	const section = active.slug;
	if (!membership)
		return (
			<main className="login">
				<section className="login-box">
					<Brand />
					<h1>Access denied</h1>
					<p>Your account has no access to this environment.</p>
					<Link href="/overview">Return to overview</Link>
				</section>
			</main>
		);
	const env = membership.environment;
	const message = empty[section as keyof typeof empty];
	return (
		<div className="workspace">
			<a className="skip" href="#main">
				Skip to content
			</a>
			<aside className="rail">
				<Brand />
				<div className="group-title">Workspace</div>
				<nav aria-label="Workspace">
					{sections.map((s) => (
						<Link
							key={s.slug}
							href={`/${s.slug}?environment=${env}`}
							aria-current={active.slug === s.slug ? "page" : undefined}
						>
							<svg
								aria-hidden="true"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinejoin="round"
							>
								<path d={s.icon} />
							</svg>
							{s.name}
						</Link>
					))}
				</nav>
				<div className="account">
					<span className="avatar">
						{staff.email.slice(0, 1).toUpperCase()}
					</span>
					<div>
						<strong>{staff.email}</strong>
						<small>{membership.role}</small>
					</div>
					<form method="post" action="/auth/logout">
						<input type="hidden" name="csrf" value={csrf} />
						<button type="submit" title="Sign out" aria-label="Sign out">
							↪
						</button>
					</form>
				</div>
			</aside>
			<main id="main">
				<div className="topline">
					<span>
						Workspace <b>/</b> {active.name}
					</span>
					<span className="env">{env}</span>
				</div>
				<header>
					<p className="overline">Kbean Health System</p>
					<h1>{active.name}</h1>
				</header>
				{staff.memberships.length > 1 && (
					<nav aria-label="Environment" className="env-nav">
						{staff.memberships.map((m) => (
							<Link
								key={m.environment}
								href={`/${active.slug}?environment=${m.environment}`}
								aria-current={env === m.environment ? "page" : undefined}
							>
								{m.environment}
							</Link>
						))}
					</nav>
				)}
				{message ? (
					<section className="panel">
						<h2>{message[0]}</h2>
						<div className="blank">
							<strong>{message[1]}</strong>
							<p>{message[2]}</p>
						</div>
					</section>
				) : (
					<Inventory
						key={section + env}
						section={active.slug}
						env={env}
						admin={membership.role === "admin"}
						csrf={csrf}
					/>
				)}
			</main>
		</div>
	);
}

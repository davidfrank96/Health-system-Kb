import { QA } from "./operations/qa";
import { Incidents, Maintenance } from "./operations/incidents";
import { Reports, Attention } from "./operations/reports";
import { Infrastructure } from "./infrastructure";
import { Monitoring, MonitorSettings } from "./monitoring";
import Link from "next/link";
import type { Staff } from "../lib/security";
import { Brand } from "./brand";
import { sections } from "./sections";
import { Inventory } from "./inventory";
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
	const ops = { env, csrf, write: membership.role !== "viewer" };
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
				{(section === "overview" || section === "application-status") && (
					<Monitoring
						key={section + env}
						env={env}
						overview={section === "overview"}
					/>
				)}
				{section === "infrastructure-health" && (
					<Infrastructure
						key={env}
						env={env}
						csrf={csrf}
						write={membership.role !== "viewer"}
					/>
				)}
				{section === "overview" && <Attention key={env} env={env} />}
				{section === "qa-security" && <QA key={env} {...ops} />}
				{section === "incidents-maintenance" && (
					<Incidents key={env} {...ops} />
				)}
				{section === "reports-history" && <Reports key={env} env={env} />}
				{section === "application-status" && (
					<Maintenance key={env} {...ops} compact services={[]} />
				)}
				{section === "settings-integrations" ? (
					<Inventory
						key={section + env}
						section={active.slug}
						env={env}
						admin={membership.role === "admin"}
						csrf={csrf}
					/>
				) : null}
				{section === "settings-integrations" && (
					<MonitorSettings
						key={env}
						env={env}
						admin={membership.role === "admin"}
						csrf={csrf}
					/>
				)}
			</main>
		</div>
	);
}

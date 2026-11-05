# Phase 00 architecture and planning report

31 October 2026 · **Documentation draft completed; Phase 00 acceptance remains open.** The repository now contains a reviewable architecture, contracts and delivery plan. Verified asset inventory, owner decisions and explicit approval are still required. No product implementation, cloud resources, IAM changes, integration enablement, deployment, commit or push occurred.

## Architecture and stack

Use a TypeScript/pnpm modular monorepo: Next.js/React/Tailwind/Zod web and REST API, a separately deployed persistent worker and Managed PostgreSQL on DigitalOcean. Kuma executes approved probes; private Prometheus retains bounded series; Grafana supports engineering diagnosis. PostgreSQL stores inventory, normalized observations/rollups, quality, incidents, QA, reports, jobs and audits. Optional Spaces holds private encrypted archives. Node 24 LTS is a candidate; exact versions, OIDC library, typed SQL/queue libraries and image digests are selected and tested in Phase 01.

A persistent worker supports five-minute schedules; App Platform cron has a 15-minute minimum. Separate public DTOs/database grants and explicit publication protect internal data; a shared web runtime still has residual compromise/outage coupling. [Overview](overview.md), [data flow](data-flow.md), [deployment](deployment.md) and [repository structure](repository-structure.md) contain the complete planned layout and responsibilities. Layout placeholders are present; runtime manifests/configuration remain future work.

## Documentation delivered

Root README, AGENTS, GOALS, PLANS, PROMPTS and CHANGELOG; preserved baseline and traceability; logical/data-flow/deployment/monitoring architecture and research register; candidate inventory; provider feasibility/adapter designs for Azure, DigitalOcean, GCP, Firebase, QA and unknown providers; schema/ERD; OpenAPI/API rules; threat model/RBAC; tests, runbooks, costs; six proposed ADRs; backlog, six phase plans, discovery/approval/review records and build log. See [README](../../README.md) for navigable links and [changed-file manifest](../../harness/build-log.md).

## Data and API architecture

The [schema proposal](../database/schema.md) defines identity, inventory, provider, telemetry, health, incident/maintenance, publication, alert/outbox, QA, report, audit and scheduler domains. UTC observation/collection/ingestion times are distinct. Composite environment constraints, series/dedupe keys, bounded JSONB, time indexes, partition-aware uniqueness and retention/rollup safeguards are specified. No database migration has been implemented.

The [OpenAPI proposal](../api/openapi.yaml) covers all baseline route groups plus publication/alert/report operations. Every operation is marked unimplemented; public readers, session-based staff and HMAC QA intake have distinct authentication boundaries. Closed public schemas omit private identifiers/diagnostics. Pagination, limits, errors, idempotency, version preconditions and cross-field rules are documented. Library-owned authentication/admin details and maintenance publication extensions remain phase backlog work.

## Integration feasibility

| Integration | Documentation outcome | Activation requirement |
| --- | --- | --- |
| Azure/Cosmos | Metric REST and JS batch SDK documented | Actual API type, resource IDs, definitions and narrow IAM review |
| DigitalOcean | Droplet/App monitoring documented | Agent availability, token read dependencies and engine-specific metric evidence |
| GCP | Monitoring client/read role documented | Descriptors, metrics-scope access, quotas and budget |
| Firebase | Underlying service metrics conditional; Crashlytics exports documented | Actual metric support; existing export/privacy/billing; approved query-job exception |
| Kuma | Supported Prometheus endpoint | Pinned-version probe freshness and sampled-history proof; approved targets/egress |
| QA/security | Proposed signed webhook/read-only polling and references | Existing platform contract, scope, owner and safe evidence destinations |
| Hashio/Fusion | Product identity unresolved | Vendor/product and supported interfaces |

[Detailed matrix](../integrations/feasibility-matrix.md). **Zero monitored assets are currently verified.** Public documentation research is not account-level verification.

## Security and verification

The [threat model](../security/threat-model.md) separates proposed controls from actual repository facts and covers credential leakage, overprivilege, SSRF at the executor, webhook replay/spoofing, authorization/environment bypass, public disclosure, dependency/CI compromise, resource exhaustion, data integrity and recovery. There is no implemented application to assess for confirmed vulnerabilities. Main proposed controls: approved OIDC users plus IdP MFA, server sessions/CSRF, scoped roles, distinct publisher grant, provider/environment identities, worker-only secrets, signed idempotent QA, private administrative interfaces and audited immutable publication.

[Testing strategy](../testing/test-strategy.md) defines unit, real-database integration, adapter/API contracts, Playwright, k6, scans/ZAP and restore/failure rehearsal. Proposed load is 100 assets/2,000 series; private API p95 <=750ms, public cached p95 <=300ms; queue delay <=60s for 99% of work; >=99% coverage for headline uptime; all authorization/secret tests must pass. These are targets, not measured results. [Phase 00 validation](../testing/phase-00-validation.md) records actual document/contract checks and their limits.

## Hosting and monthly budget

Separate staging and production applications/workers/databases plus monitoring Droplets; production proposes primary+standby Managed PostgreSQL and a second-region independent checker. Initial public UI remains coupled to the primary app; all-DO outage remains shared risk. VPC access conflicts with App Platform dedicated egress IPs; resolve provider source-IP requirements before deployment.

Estimated staging $78 + production $356 = **$434/month before tax**, or **$520.80 with 20% contingency**. This includes a $260 new Advanced PostgreSQL primary+standby allowance because announced Standard edition eligibility changes affect the delivery period. A single-node production alternative totals $204 before contingency but needs explicit weaker-resilience acceptance. Provider query costs, extra transfer, notifications, domain/support and labor are excluded. [Itemized cost and sources](../deployment/cost-estimate.md). Proposed durable RPO/RTO 1h/4h and monitoring 24h/8h need timed proof; seven-day daily managed backups alone do not guarantee them.

## Delivery and significant decisions

Phase 00 review/discovery: 20 Nov 2026 → Phase 01 foundation/staging: 18 Dec → Phase 02 adapters/dashboard: 29 Jan 2027 → Phase 03 status/incidents: 19 Feb → Phase 04 QA/alerts/reports: 12 Mar → Phase 05 verification/authorized release: 31 Mar. Dependencies and gated acceptance are in [PLANS](../../PLANS.md) and [backlog](../../harness/build/backlog.md).

Six ADRs propose modular monolith/worker, separate data quality, explicit publication, effective provider scopes/query exceptions, hosting/recovery budget and supported sampled availability. They remain proposed. No silent replacement of the baseline is approved.

## Required decisions and next steps

1. Review this packet and Q01–Q17 in the [approval register](../../harness/context/decisions-and-open-questions.md); record accountable owners and the exact reviewed revision.
2. Supply or authorize access to a minimal read-only asset inventory and confirm approved service/public mappings. Confirm repository privacy/licensing, IdP/MFA and QA ownership; do not provide broad production credentials.
3. Approve region/network model, effective provider permission scope, retention/publication/availability policies, measured workload targets, budget ceiling and proposed recovery objectives. Defer unsupported integrations explicitly.
4. Complete the Phase 00 gate, then explicitly authorize the [Phase 01 implementation plan](../../harness/build/phase-01.md). Provisioning, staging deployment and Git push need their own explicit scope; approving architecture alone is not authorization for all three.
5. Phase 01 then begins with workspace/version/library selection, tested DB/auth/worker foundations and honest empty-state UI. It must stop at its own review gate.

The work stops here at the requested documentation boundary. Architecture approval and verified discovery have not been inferred or fabricated.

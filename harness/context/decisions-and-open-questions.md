# Lean approval register

31 October 2026. The owner chose the lean internal direction; the following operational values and implementation permissions remain unapproved. Record named approver, date, exact document/revision, allowed actions, ceiling/lifetime and exceptions. Required owner roles below are not invented people or completed approvals.

| ID | Decision/evidence | Owner | Blocking point / proposed default |
| --- | --- | --- | --- |
| L01 | Verify service inventory, endpoint canonical URL/safe response, probe load and environment | Service owners | Any live probe; all disabled until approved |
| L02 | Google organization, approved subjects, enforced MFA and auth library compatibility | Identity/security | Phase 01 approval/auth; no paid IdP |
| L03 | Actual DO region/SKU/private connectivity, web/job secret recipients, small DB limits | Infrastructure | Deployment; one web/DB/job, no static-egress add-on |
| L04 | USD pricing, job eligibility/proration/minimum/retries/startup, FX/tax, runtime and hard spending limit | Budget/infrastructure | Phase 01 approval and any spend; ~$27 base/$35 envelope, ~€50 target not a guarantee |
| L05 | Source effective read permissions, no-incremental-cost evidence, shared allowances/forecast/reserve, expiry/caps | Provider/security/billing | Each integration enablement; unknown disabled/manual |
| L06 | Confirm 15m sampled availability, two-slot confirmation and 35m stale policy | Product/operations | Phase 02; short outages and scheduler delays accepted explicitly |
| L07 | Manual schema/provenance, retention/holds, small workload and recovery objectives | Engineering/security/operations | Design approval; 20 endpoints/100 series, 5 concurrent staff; RPO24h/RTO1 business day proposals |
| L08 | Existing QA no-cost interface/protocol/key ownership, suite schedules and evidence scope | QA/security | Phase 04 automatic intake; manual fallback |
| L09 | Temporary remote test/managed restore reason, resources, hours, max cost and cleanup owner | Infrastructure/budget | Each temporary test; no permanent staging |
| L10 | Single web/DB/provider risk and no independent failure alert while system is down | Product/operations | Release acceptance; no new paid checker |
| L11 | Repo privacy/ownership, Apache license intent, CI allowance and existing domain | Repository/budget | Release/procurement; existing name/license retained |
| L12 | Explicit revised Phase 01 local implementation scope | Project owner | Local foundation, native PostgreSQL and automated tests authorized 5 November; stop at review |
| L13 | Exact provision/deploy/commit/push authorization | Project/infrastructure owner | Phase 00 publish completed; separate authority for further mutations |

## Risks and limits

- Job billing/minimum ambiguity or startup/retry overrun can exceed modeled allowance: validate account facts and actual behavior; no assumed hard cap (L04).
- Shared GCP allowance can be consumed elsewhere; metric retrieval may be billable even for free metrics: conservative reservation and current external-use evidence, otherwise disable (L05).
- Safe HTTPS probes may consume existing target execution/egress: verify approved traffic is acceptable (L01/L05).
- Manual snapshots can be stale/misleading: source/time/actor labels, unit checks and audited corrections, never automatic availability (L07).
- 15m samples miss outages; two-slot confirmation is slow; own infrastructure outage is not independently observable from within it (L06/L10).
- Small plans may be insufficient: measure, reduce optional work visibly or request approval; no auto-upgrade (L04/L07).
- Restore/temporary-test costs can exceed the small reserve: require specific approval; do not skip required recovery proof to conceal cost (L09).

No production risk has been formally accepted and the quality addendum covers local verification tooling only. Inventory, identity and final budget approval are necessary before Phase 01; optional provider sources can remain disabled without blocking core availability.

On 5 November 2026 the project owner authorized local Phase 01 engineering-quality work against published baseline `74fa0f1`: test dependencies, disposable DB/browser fixtures, PR workflow preparation and milestone/phase reporting. Hosted CI usage, product rollout and external infrastructure changes require their applicable gates.

Subsequent owner decision, 5 November: L12 covers the Phase 01 application, a local development branch and native PostgreSQL development/testing. The later native decision supersedes the interim managed-only direction. Existing PostgreSQL 18 binaries were reused; Postgres.app is the preferred macOS installation. No commit, push, merge, provisioning, external database connection, deployment or Phase 02 is authorized.


## Phase 02 authority and decisions · 6 November 2026

Owner execution prompt authorized local Phase02 after baseline verification. Phase01 merged via PR#1 at f9423c0 and hosted CI passed; all88 baseline tests reran successfully. Branch phase-02/availability-monitoring is local. The instruction explicitly requires separate feature-branch publication approval and owner-reviewed PR before merge. No cloud, deployment, live target, paid API or Phase03 authority exists.

Retain lean two-failure/two-success and35m freshness policies. Safe configurable thresholds preserve those defaults. Daily per-endpoint96-slot summaries are a small implementation refinement to preserve partial-day and historically-required service arithmetic; no additional service/table pipeline. Minimal offline future maintenance evidence supports Phase02 without implementing Phase04 incidents. Pure local fixtures are the only execution capability. Native PostgreSQL18 decision remains unchanged.

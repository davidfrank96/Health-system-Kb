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
| L12 | Explicit revised Phase 01 local implementation scope | Project owner | Any implementation; not granted by architecture revision |
| L13 | Exact provision/deploy/commit/push authorization | Project/infrastructure owner | Each external/repository mutation; none granted now |

## Risks and limits

- Job billing/minimum ambiguity or startup/retry overrun can exceed modeled allowance: validate account facts and actual behavior; no assumed hard cap (L04).
- Shared GCP allowance can be consumed elsewhere; metric retrieval may be billable even for free metrics: conservative reservation and current external-use evidence, otherwise disable (L05).
- Safe HTTPS probes may consume existing target execution/egress: verify approved traffic is acceptable (L01/L05).
- Manual snapshots can be stale/misleading: source/time/actor labels, unit checks and audited corrections, never automatic availability (L07).
- 15m samples miss outages; two-slot confirmation is slow; own infrastructure outage is not independently observable from within it (L06/L10).
- Small plans may be insufficient: measure, reduce optional work visibly or request approval; no auto-upgrade (L04/L07).
- Restore/temporary-test costs can exceed the small reserve: require specific approval; do not skip required recovery proof to conceal cost (L09).

No production risk has been formally accepted and no implementation/deployment/push is approved. Inventory, identity and final budget approval are necessary before Phase 01; optional provider sources can remain disabled without blocking core availability.

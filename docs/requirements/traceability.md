# Lean requirements traceability

Current authority: [lean revision](lean-architecture.md), particularly correction instructions sections 1–14. [Original master](master-architecture.md) is historical for conflicting scope. All functionality remains unimplemented.

| ID / revised section | Requirement | Current design / planned evidence |
| --- | --- | --- |
| LEAN-01 / 1,6 | Internal staff dashboard and seven sections | Overview, GOALS, API; L01/L02/L04 auth+functional tests |
| LEAN-02 / 2 | ~€50 target, no additional paid APIs/AI, disabled unknown costs | Cost estimate, matrix, cost-gated adapters; L03-1 no-call tests and L04 approval evidence |
| LEAN-03 / 3,10 | One web/DB and finite 15m job, local-first testing | Deployment/layout/data flow; L02 job overlap/deadline; L05 authorized release |
| LEAN-04 / 4 | Remove/defer extra runtime components | Change summary, ADR0007, cleaned layout/API; contradiction scan |
| LEAN-05 / 5 availability | HTTPS status/time/latency/history/downtime/recovery | Monitoring model; L02 safe executor, slot/unknown/confirmation tests |
| LEAN-06 / 5 infrastructure | DO first; verified zero-cost only; manual/CSV fallback | Provider designs/manual contract; L03 caps/provenance/import tests |
| LEAN-07 / 5 QA | Existing no-charge QA and security references, no runner | QA contract; L04 signature/role/replay/manual tests |
| LEAN-08 / 7 | Auth/MFA/RBAC/secrets/SSRF/TLS/audit/isolation | Threat model/access control; L01/L02/L05 denial/executor/security tests |
| LEAN-09 / 8 | Small schema with attribution/time/freshness/constraints/retention | Schema/ERD; local migrations/constraint/retention/restore tests |
| LEAN-10 / 9 | Daily/weekly/monthly/QA reports, charts and CSV in app | Reports contract/runbook; L04 bounded queries/escaping/coverage |
| LEAN-11 / 11 | Full testing proportionate to staff workload | Test strategy; local-first and explicitly approved temporary proof |
| LEAN-12 / 12,13 | Reconcile docs/ADRs/plans, keep history and 14 deliverables | Report, change summary, v1 hash archive, validation/build log |
| LEAN-13 / 14 | Documentation only; no installs/code/cloud/commit/push | AGENTS/PLANS; file scope and command record |

Retained original principles: read-only monitoring, verified assets, no fake metrics, security/testing/history/incidents, modular maintainability, phased approval. Superseded: public status/subscriber requirements; worker/probe stack; five-minute or 60s cadence; HA/continuous staging/secondary region/archive; large time-series model and old pricing. No former public feature gate survives in the active MVP roadmap.

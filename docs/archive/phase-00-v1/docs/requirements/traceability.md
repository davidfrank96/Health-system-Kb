# Requirement traceability

The baseline is [master-architecture.md](master-architecture.md), version 1.0 supplied 31 October 2026. IDs below map its master specification sections to design and future proof. Every feature remains unimplemented. A document mapping is not acceptance evidence.

| ID / baseline section | Required outcome | Design | Backlog / proof |
| --- | --- | --- | --- |
| REQ-01 / 1 | Mission, read-only scope and non-goals | GOALS.md, overview | P00-03 scope approval; all phase reviews |
| REQ-02 / 2.1 | Approved public status, 90-day history, incidents, maintenance, notifications | Monitoring model, public API/projection | P03-01–04; privacy/coverage/mobile tests; feed/subscription decision Q13 |
| REQ-03 / 2.2 | Authenticated operational dashboard areas | Overview, access control, API | P01-03/04, P02-06, P04-04; role/environment E2E |
| REQ-04 / 2.3 | Existing QA results, idempotent/source-traceable | QA contract, inbox/schema | P04-01; signature/replay/counts/duplicate tests |
| REQ-05 / 3 | Verified inventory and supported capabilities | Inventory, feasibility matrix | P00-02/P02-01; owner and provider evidence pending |
| REQ-06 / 4 | Modular web/worker/Postgres/monitoring/storage design | Overview, data flow, deployment | P01-01/02/05, P03-01; integration/recovery tests |
| REQ-07 / 5 | Scoped Azure/DO/GCP/Firebase/future adapters | Separate integration designs | P02-01–05; fixtures + authorized live read; unsupported capability gate |
| REQ-08 / 6 | Schedules, quality, availability and retention | Monitoring model, schema | P02-01/P03-02; null/gap/maintenance/late-data tests |
| REQ-09 / 7 | Relational schema, timestamps, constraints and indexes | Schema/ERD | P01-02/P02-06; migration/constraint/query-plan tests |
| REQ-10 / 8 | Versioned authenticated/public APIs | OpenAPI and API rules | P01-04 onward; schema validation and endpoint conformance |
| REQ-11 / 9 | Auth/MFA/RBAC/secrets/SSRF/audit/isolation | Threat model and access control | P01-03/P05-01; denial/SSRF/secret/replay/staging security checks |
| REQ-12 / 10 | Owned, deduplicated alert/incident lifecycle | Monitoring model, outbox/data flow | P03-03/P04-02; thresholds/cooldown/maintenance/ack tests |
| REQ-13 / 11 | Daily/weekly/monthly HTML/CSV/JSON reports | Data flow, schema/API, runbooks | P04-03; immutable snapshots, provenance, export access/safety |
| REQ-14 / 12 | Clear responsive accessible UI without fake health | GOALS, test strategy | P01-04/P02-06/P03-04; viewport/keyboard/empty/error/stale tests |
| REQ-15 / 13 | DO staging/prod, networks, backup and self-monitoring | Deployment, costs, runbooks | P01-07/P05-02; authorization, restore and independent failure evidence |
| REQ-16 / 14–15 | Repository layout and AI/planning files | Repository structure, AGENTS/GOALS/PLANS/PROMPTS | P00-01; documentation/link/contract validation |
| REQ-17 / 16 | Unit/integration/E2E/performance/security release evidence | Test strategy, phase plans/build log | Every implementation item; P05-01 final release report |
| REQ-18 / 17 | Phases, milestones and acceptance gates | PLANS, backlog, phase 00–05 plans | Named approval records at each boundary |
| REQ-19 / 18–19 | Planning only, no infrastructure/code/push without approval | AGENTS, register, build log | Scope diff inspection; Phase 01 not authorized |

Design clarifications awaiting approval: explicit public Unknown, two-axis health, maintenance-excluded headline with coverage/bounds, sampled availability limitations, publisher capability, BigQuery query-job exception, database HA budget and recovery targets. See ADRs and Q01–Q17. PDF export remains optional/deferred; unknown providers and unavailable metrics cannot be silently represented as delivered.

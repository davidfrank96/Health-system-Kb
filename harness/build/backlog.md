# Lean implementation backlog

L01-1 through L01-5 are implemented locally. See the Phase 01 report for executed checks, pending hosted CI and the owner review gate. The minimum useful path is staff login/inventory → sampled HTTPS availability → free/manual infrastructure → existing QA/incidents/reports → verified release. Original dates remain targets in PLANS. No removed component is a dependency.

| ID / phase | Deliverable | Dependencies | Acceptance evidence |
| --- | --- | --- | --- |
| L00-1 / 00 | Revise and reconcile packet; preserve v1 | Lean user brief | Contract/docs/scope/history checks |
| L00-2 / 00 | Verify targets, identity, budget and source gate design | Owner evidence | L01–L07 decisions; no automatic cost assumptions |
| L00-3 / 00 | Approve revised local Phase 01 scope | L00-1/2 | Named approval and revision |
| L01-1 / 01 | Minimal pnpm/TS Next.js scaffold and server modules | Approved Phase 00 | Supported pinned toolchain, build/lint/typecheck; no telemetry fixtures in production |
| L01-2 / 01 | Local PostgreSQL identity/service/inventory migrations | L01-1 | Real DB constraints/grants/upgrade/restore tests |
| L01-3 / 01 | Google OIDC allowlist, sessions, env RBAC, CSRF | L01-2, identity owner | Unapproved identity/role/env denied, logout/revocation tested |
| L01-4 / 01 | Inventory settings/basic private overview and safe API conventions | L01-3 | All private routes, honest empty states, no live collector |
| L01-5 / 01 | Local CI/dependency/secret/test checks | Harness from the first milestone; feature suites alongside L01-1–4 | Local evidence and prepared PR workflow in the Phase 01 report; hosted run pending |
| L02-1 / 02 | Approved HTTPS executor + finite job entrypoint | 01, target approval | DNS/IP/redirect/TLS/timeout/size/retry fixtures; no private addresses |
| L02-2 / 02 | Run lock/slot dedupe, check persistence and gap states | L02-1 | Overlap/crash/lost-lock/idempotency; no catch-up requests |
| L02-3 / 02 | Sample history/last-success/downtime/recovery/daily counts | L02-2 | Two-slot confirmation, unknown/maintenance/missing arithmetic |
| L02-4 / 02 | Job spec design and runtime/cost evidence | L02-1–3 | Local duration first; live scheduling only within explicit test approval |
| L03-1 / 03 | Cost/permission approval metadata and default-disabled adapter gate | 02 | Zero outbound requests on unverified/expired/exhausted evidence |
| L03-2 / 03 | DO supported monitoring | L03-1, owner effective scope/cost proof | Real documented metrics only, fixtures and separately approved bounded reads |
| L03-3 / 03 | Manual snapshots/CSV preview/atomic import and source labels | 01, descriptor approval | RBAC/env/unit/time/digest/duplicate/formula tests |
| L03-4 / 03 | Other existing free adapters only where demonstrated | L03-1, per-source evidence | Conservative series/request caps; manual fallback; Azure disabled absent zero-cost proof |
| L04-1 / 04 | Existing QA webhook/API/manual import and security references | 01, QA agreement | Synchronous commit, HMAC/replay/scope/duplicate/provenance tests |
| L04-2 / 04 | Internal incident/maintenance timeline | 02/01 | Roles/revisions/chronology and sampled downtime distinction |
| L04-3 / 04 | Daily/weekly/monthly/QA summaries, charts and CSV | 02–04 data | Bounded query/coverage/manual labels; safe export; no report queue |
| L05-1 / 05 | Full local regression, controlled security and small-plan load | 01–04 | Test strategy gates; no unresolved unaccepted high/critical issue |
| L05-2 / 05 | Costed temporary tests/managed restore where required | L05-1, specific approval | Real recovery and small-plan/job behavior, cleanup evidence |
| L05-3 / 05 | Explicit DO provisioning/release and handover | All gates, budget and deploy scope | Private access/TLS/permissions, measured job billing/runtime, rollback/owner acceptance |

Unknown-cost optional providers do not block core HTTPS/manual use; keep them visibly disabled. No task includes a permanent remote staging stack, public API, paid integration, queue service or runtime AI. Additions need a new scope/budget decision.

Phase 03 local delivery and verification of L03-1 through L03-4 are recorded in the [acceptance report](../../docs/reports/phase-03-report.md). Account permissions, allowance evidence and bounded live validation remain owner decisions.

L04-1–L04-3 are implemented for local review on phase-04/qa-incidents-reports. The sender is verified only against controlled fixtures; the optional read API and live activation are deferred until owner approval. See the [Phase 04 report](../../docs/reports/phase-04-report.md).

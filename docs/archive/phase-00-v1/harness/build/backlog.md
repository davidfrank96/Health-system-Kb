# Implementation backlog

All items are planned; no implementation is authorized. Targets follow PLANS.md. Requirements refer to numbered sections within the master specification, not the introductory section numbering. Each item must produce an evidence-backed completion report and documentation update.

| ID / phase | Deliverable | Depends on | Acceptance / risk gate |
| --- | --- | --- | --- |
| P00-01 / 00 | Preserve baseline, inspect repo, AI instructions and traceability | User brief | Document validation; no implementation |
| P00-02 / 00 | Verified asset/permission inventory and provider feasibility | Owner evidence | Q02/Q08; docs-only feasibility insufficient for enablement |
| P00-03 / 00 | Architecture/schema/API/security/test/cost review | P00-01/02 | Q01–Q07/Q15, approved revision and Phase 01 scope |
| P01-01 / 01 | pnpm/TS workspace, pinned Node, package boundaries | Approved 00 | Clean install/lint/typecheck/build; no real telemetry fixtures in production |
| P01-02 / 01 | Postgres migrations, env constraints, isolated local DB | P01-01 | Migration/constraint/restore tests; select reviewed SQL library |
| P01-03 / 01 | Google OIDC, sessions, membership/RBAC and CSRF | P01-02,Q03 | All role/env denials, revocation, unauthorized Google account rejection |
| P01-04 / 01 | API error/pagination/config contracts, app shell | P01-03 | Empty/loading/error/stale states; no fake live data; finalize identity/admin API |
| P01-05 / 01 | Worker scheduling/lease/inbox foundation | P01-02 | Duplicate/reclaim/fencing/shutdown tests against real local Postgres |
| P01-06 / 01 | CI/security checks, staged artifact procedure | P01-01 | Untrusted PR no secrets, immutable artifact, scan evidence |
| P01-07 / 01 | Authorized isolated staging setup and smoke | P01-02–06,Q05–07,Q17 | Explicit provisioning permission, TLS/grants/env separation and rollback smoke |
| P02-01 / 02 | Capability registry and normalized metrics | 01,Q08 | Descriptor discovery; null/stale/unsupported tests |
| P02-02 / 02 | Azure/Cosmos adapter | P02-01 | Scoped read requests, units/dimensions/429/lag fixtures + approved live read |
| P02-03 / 02 | DigitalOcean adapter | P02-01 | Agent/unsupported metrics, effective token scope and no write route tests |
| P02-04 / 02 | GCP/Firebase operational adapters | P02-01 | Verified descriptors/scopes; no Firebase Admin credentials |
| P02-05 / 02 | Optional Crashlytics aggregate ingestion | P02-04,Q09 | Query budget/privacy evidence, daily lag/null denominators |
| P02-06 / 02 | Resource pages and bounded history | P02-02/03 | Env filters, coverage, pagination and performance baseline |
| P03-01 / 03 | Approved Kuma/Prometheus/Grafana stack and mapping | 01,Q02,Q11 | Executor SSRF/network proof, source recency and private access tests |
| P03-02 / 03 | Availability intervals and daily rollups | P03-01 | Gap/overlap/maintenance/late-correction arithmetic; honest pre-onboarding history |
| P03-03 / 03 | Incident/maintenance lifecycle and public revisions | 01,Q04 | Scope/digest/approval/optimistic concurrency; extend maintenance publication API |
| P03-04 / 03 | Public status/responsive history/feed | P03-02/03,Q13 | No internal data, keyboard/mobile checks and unknown coverage display |
| P04-01 / 04 | QA ingestion/polling and references | 02,Q10 | Signature/replay/duplicate/cross-env/collision tests; no QA engine |
| P04-02 / 04 | Alert policy/lifecycle, delivery outbox | 02–03,Q12 | Authority/dedupe/cooldown/maintenance/evidence-loss tests |
| P04-03 / 04 | Daily/weekly/monthly reports and exports | P04-01/02 | Reconciled durations, safe HTML/CSV/JSON, authorized download |
| P04-04 / 04 | Operational administration and audit views | 01, P04-02 | Final management contracts; role boundaries and append-only audits |
| P05-01 / 05 | Full regression/performance/security | 01–04 | Thresholds met; critical/high resolved or formally accepted |
| P05-02 / 05 | Restore/rollback/failure rehearsal and independent check | P05-01,Q07/Q16 | Timed RPO/RTO proof; independent path works while primary disabled |
| P05-03 / 05 | Authorized production rollout, handover, training | P05-01/02,Q17 | Explicit deploy authorization, smoke/rollback criteria, owner acceptance |

Critical path: verified inventory/identity/network/budget → foundation → measured adapters → trustworthy availability/publication → operational workflows → full release evidence. GCP/Firebase optional capabilities can be independently deferred by explicit scope decision. Phase dates are not promises that missing access will be resolved automatically.

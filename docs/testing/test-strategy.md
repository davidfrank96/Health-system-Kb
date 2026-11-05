# Lean verification strategy

Documentation revision checks only now. Later implementation needs meaningful tests; no dependency installation, app build, provider probe or restore occurred during this revision.

| Layer | Tool/target | Required proof |
| --- | --- | --- |
| Unit | Vitest domain functions | Sample counts/maintenance/unknowns, confirmation, freshness, units, import validation, cost-gate decisions |
| Database integration | Real local PostgreSQL + fixtures | Migrations/FKs/roles, unique slot/dedupe, advisory lock connection loss, transaction rollback, retention/reconciliation |
| API/auth/contracts | Local app + OIDC test issuer, provider fixtures | Session/role/env denials, every private status/export route, disabled-no-request adapters, bounds, QA HMAC/replay, import provenance |
| Functional | Playwright local | Login/access, seven private sections, services/status/history, manual preview/commit, QA, incidents/maintenance/reports, no fake live data |
| Performance | Safe bounded k6/local or explicitly approved temporary target | Internal workload, 1 GiB memory limits, query/import/job duration, no uncontrolled production tests |
| Security | Dependency/secret scanning, controlled ZAP/local checks | Auth/CSRF/headers/cookies, executor SSRF/DNS/IPv6/redirects, safe CSV/links, no build/provider secret leakage |
| Recovery | Local SQL restore plus separately approved temporary managed restore | Data consistency, reconnect/rollback, actual recovery point/time, job disabled in restored tests, cleanup/cost evidence |

## Proposed modest workload and gates

Assume 10 staff accounts, five concurrent staff sessions, 20 approved HTTPS endpoints, <=100 infrastructure series, <=100 QA runs/day. These are sizing hypotheses awaiting verified inventory. No public load target. Local test corpus: 30d raw checks (57,600), metrics (288,000), 12m daily summaries (7,300), representative QA/incidents/audit. Synthetic data stays isolated and labeled.

- Dashboard/latest read API p95 <=1s at five concurrent staff; bounded 90d history p95 <=2s. 15-minute steady load plus 2-minute 10-user spike; unexpected errors <1%, no OOM under 1 GiB app and test DB memory constraints. Cold start measured separately.
- Normal finite collection target <=120s, absolute process deadline 300s including cleanup; <=40 probe attempts, four concurrent, <=2 attempts/slot. No duplicate requests on concurrent completed/running slot invocation; skipped/missed slots visible. Test lost lock connection, crash mid-write, DNS outage, slow response and quota denial. Platform schedule lag, startup/billing and hard timeout behavior need authorized deployment evidence; local speed is not proof of remote cost.
- Confirm downtime only after two distinct failed slots; retry is one vote. Two valid successes resolve; missing/maintenance slots break pending sequence. No <=5-minute detection or real-time SLA at 15m cadence. Sample arithmetic example in monitoring-model must reconcile, including zero coverage and pre-onboarding time.
- Manual import <=500 rows/256 KiB, preview p95 <=2s and atomic commit <=5s locally; malformed/cross-env rows leave zero writes. Manual labels persist in UI/history/CSV; formula text is safely escaped. QA <=128 KiB validates/commits p95 <=1s locally, identical duplicate produces one run.
- Disabled/unverified/expired/exhausted cost approvals yield **zero outbound provider requests**. Usage reservations include all page/retry/empty-call minima; quota uncertainty pauses. No test equates a warning threshold with an enforced billing cap.
- 360/768/1440px layouts have no overlap/overflow; keyboard/focus and screen-reader review, WCAG 2.2 AA goal, zero critical automated accessibility failures.
- All auth/role/env, secret-redaction, SSRF, input/QA signature and migration checks pass. Critical/high findings must be fixed or explicitly accepted with owner/expiry; no silent omissions.
- Proposed recovery objectives RPO <=24h and RTO <=1 business day; measured managed restore and cleanup before release. More ambitious guarantees, independent uptime SLO or external notification delivery targets are not MVP acceptance criteria.

Local tests are primary. Remote staging is only for a documented gap (OIDC deployment behavior, small-plan performance, managed restore), with approved budget/lifetime and teardown. Document commands, versions, revision, targets, workload, pass/fail and limitations per phase. Passing document/OpenAPI checks does not mean runtime requirements are satisfied.

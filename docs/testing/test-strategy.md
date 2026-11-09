# Lean verification strategy

Use this strategy during every implementation milestone. Current executed evidence and the open product checks are in the [Phase 01 report](../reports/phase-01-report.md).

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

## Local setup and checks

Use [native PostgreSQL setup and reset](../database/local-development.md). Development is persistent and automated integration/browser tests run on disposable databases. The built application uses real OIDC code exchange with a signed local issuer, real sessions, real inventory routes and the restricted web DB role. Cloud integrations stay disabled. Keep component-fixture and API contract results separate from running application evidence.

```sh
corepack pnpm install --frozen-lockfile
PLAYWRIGHT_SKIP_BROWSER_GC=1 corepack pnpm exec playwright install chromium --only-shell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit
NEXT_TELEMETRY_DISABLED=1 corepack pnpm build
corepack pnpm test:e2e
corepack pnpm test:db
corepack pnpm audit --audit-level=high
gitleaks git --redact --ignore-gitleaks-allow --log-opts=HEAD .
```

The first Playwright command runs public application behavior, OIDC failure cases, context isolation and a separate dashboard component fixture. The combined DB command validates migrations and grants, then runs authenticated Playwright against the actual built app. Separate commands are available as `test:integration` and `test:e2e:db`. Record missing prerequisites or suites as pending. Git secret checks cover history through HEAD; scan working changes separately. The PR workflow uses one hosted runner, an isolated PostgreSQL 18 service, a 15-minute timeout and three-day failure-only browser artifacts. Credentials for production or cloud systems must never reach PR code. Synthetic traces may contain temporary local session data.

## Phase report and acceptance

At each significant milestone record the requirement, changed behavior, revision, commands, tool versions, fixture/target, passed/failed/skipped counts, unexecuted checks and reason, defects, blockers and next action in the build log. Give the owner a short progress report. Maintain architecture, setup/configuration, API, database and security documentation with the feature. Select coverage for critical behavior and regression risk without a percentage quota.

Maintain one report per phase at `docs/reports/phase-XX-report.md` from Phase 01 onward. Mark milestone reports in progress until all phase criteria are evidenced.

| Section | Evidence required |
| --- | --- |
| A. Implementation summary | Completed, partial and pending features, requirement IDs and technical decisions |
| B. Architecture and code changes | Modules, migrations, API, dependencies and configuration |
| C. Testing report | Tests implemented and executed by layer, commands and counts, Playwright/authorization results, failures, skips, unrun checks and defects |
| D. Documentation | Updated docs, decisions, setup instructions and remaining gaps |
| E. Security and quality review | Controls verified on actual targets, configuration and dependency issues, remaining risks and limitations |
| F. Phase acceptance | Criterion-by-criterion evidence, blockers, repository/branch status and readiness for owner review |

Accept only when the approved features work, required tests ran, critical failures are resolved, phase security controls are validated, current docs and known limitations are recorded, and the report is reviewable. Keep the gate open where proof is missing. Stop before the next phase until it is explicitly authorized.


## Phase 02 additions

The [monitoring guide](../operations/availability-monitoring.md) documents the native fixture and database commands. Unit tests include actual controlled HTTP/TLS requests as well as pure classifications, IP/DNS rejection and count arithmetic. PostgreSQL tests execute the finite runner with real endpoints, overlap/duplicate/connection-loss paths,20 targets and40 attempts, migrations/permissions, downtime/recovery and retained history. Browser tests run the built app against stored controlled collection results, use signed synthetic staff login, and exercise config/approval/RBAC/API/error/retry/history at desktop/mobile sizes. The prior inventory-timeout test follows inventory management to Settings; its assertions remain and a separate actual-DB monitoring-timeout test is added. No suite is silently skipped.

Phase 02 uses the owner's expanded A–K report format in docs/reports/phase-02-report.md, including executive/implementation/architecture/database/security/tests/application/Git/documentation/limitations/acceptance sections. Checkpoints A–D update the build log and owner throughout. Hosted Phase 01 workflow41954771693 passed; Phase 02 hosted evidence remains pending publication approval. Test screenshots/traces contain only synthetic local data and must still be reviewed before publication.

## Phase 03 implementation

The Phase 03 suite covers gated fixtures, cumulative CPU normalization, PostgreSQL role/constraint boundaries, corrections, retention, actual API imports and responsive history. Browser evidence uses synthetic inventory and a controlled DigitalOcean response. Run the commands in the [infrastructure guide](../operations/infrastructure-health.md); see [acceptance results](../reports/phase-03-report.md).

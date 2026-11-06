# Build log

## 31 October 2026 — lean Phase 00 revision

User authorized documentation/architecture revision only and explicitly prohibited implementation, dependency installation, databases/cloud resources, live integration configuration, IAM changes, deployment, commit and push. The owner-selected lean direction supersedes conflicting earlier proposals; Phase 01 approval remains pending.

### Work

Archived 52 original planning/contract/license/ignore files byte-for-byte with SHA-256 manifest; retained original requirement prose and saved revised brief with labeled diagram repair. Revised roots, architecture, schema/API, integration/import strategy, security, tests, runbooks, costs, all phase plans/backlog, research/approval/review records. Marked ADRs 0001–0006 superseded, added ADR0007 and explicit before/after/deferred scope. Removed only obsolete empty directory placeholders; added jobs placeholder.

Current runtime design is one internal web app, small single-node Managed PostgreSQL and finite 15m job. Budget $27 fixed/$35 pre-tax-FX planning envelope, ~€50 target subject to account proof. All unknown-cost sources disabled; DO first, manual imports and existing QA. No public status/queue/monitoring host/HA/archive/paid API/AI dependency. Independent offline architecture review under the threat-model skill informed the revised boundaries; no vulnerability scan or runtime control claim.

### Checks and results

- `/tmp/kbean-phase00-doccheck/bin/python /tmp/kbean_lean_validate.py`: PASS after correction of binary-floating-point rounding in the disposable arithmetic check. OpenAPI 28 paths/33 operations/43 schemas; staff operational auth and separate QA signature; no public/queue remnants; closed manual inputs and 900s samples; all 52 historical hashes intact; baseline/links/fences/scope/schema count/arithmetic checks.
- `git -C Health-system-Kb diff --check`: PASS. Separate active added-file whitespace and limited credential-pattern screens: PASS. Existing LICENSE/.gitignore unchanged.
- Reused already-installed temporary Python/PyYAML/OpenAPI validator; **no installation command run**. External research was public documentation only; no account/target access.
- Initial check failure and corrected Decimal rounding are recorded in [validation](../docs/testing/phase-00-validation.md). No unresolved mechanical failure; runtime tests NOT EXECUTED because no implementation is authorized.

### Remaining gates

Verify inventory/IdP, actual DO/job billing/limit/FX/tax and small workload; approve source permissions/no-charge allowances, retention/sampling/recovery; explicitly authorize Phase 01 local work. Optional uncertain integrations remain disabled/manual. Every temporary test/restore/resource/deploy/push requires its own explicit scope. No approval inferred.

### Earlier work

The original Phase 00 log and results are preserved in [v1 build log](../docs/archive/phase-00-v1/harness/build-log.md); its old scope and any previous validation-tool installation are historical, not actions in this revision.

### Changed-file manifest for this revision

Active files revised relative to the pre-revision snapshot:

- `AGENTS.md`
- `CHANGELOG.md`
- `GOALS.md`
- `PLANS.md`
- `PROMPTS.md`
- `README.md`
- `docs/api/README.md`
- `docs/api/openapi.yaml`
- `docs/architecture/data-flow.md`
- `docs/architecture/deployment.md`
- `docs/architecture/monitoring-model.md`
- `docs/architecture/overview.md`
- `docs/architecture/phase-00-report.md`
- `docs/architecture/repository-structure.md`
- `docs/architecture/research.md`
- `docs/assets/inventory.md`
- `docs/database/schema.md`
- `docs/decisions/0001-modular-monolith.md`
- `docs/decisions/0002-telemetry-quality.md`
- `docs/decisions/0003-publication-boundary.md`
- `docs/decisions/0004-provider-read-scope.md`
- `docs/decisions/0005-hosting-recovery-budget.md`
- `docs/decisions/0006-availability-source.md`
- `docs/deployment/cost-estimate.md`
- `docs/integrations/adapter-contract.md`
- `docs/integrations/azure.md`
- `docs/integrations/digitalocean.md`
- `docs/integrations/feasibility-matrix.md`
- `docs/integrations/firebase.md`
- `docs/integrations/future-providers.md`
- `docs/integrations/gcp.md`
- `docs/integrations/qa.md`
- `docs/operations/runbooks.md`
- `docs/requirements/master-architecture.md`
- `docs/requirements/traceability.md`
- `docs/security/access-control.md`
- `docs/security/threat-model.md`
- `docs/testing/phase-00-validation.md`
- `docs/testing/test-strategy.md`
- `harness/build-log.md`
- `harness/build/backlog.md`
- `harness/build/phase-00.md`
- `harness/build/phase-01.md`
- `harness/build/phase-02.md`
- `harness/build/phase-03.md`
- `harness/build/phase-04.md`
- `harness/build/phase-05.md`
- `harness/code-review/phase-00.md`
- `harness/context/decisions-and-open-questions.md`
- `harness/context/discovery.md`

New active planning files:

- `docs/architecture/change-summary.md`
- `docs/decisions/0007-lean-internal-mvp.md`
- `docs/integrations/manual-imports.md`
- `docs/requirements/lean-architecture.md`

History added: `docs/archive/phase-00-v1/` contains the 52 originals listed in its `snapshot-manifest.json`, plus that manifest and `HISTORICAL.md`.

Placeholder added: `jobs/.gitkeep`. Obsolete empty placeholders removed:

- `apps/worker/.gitkeep`
- `packages/database/.gitkeep`
- `packages/integrations/.gitkeep`
- `packages/monitoring/.gitkeep`
- `packages/contracts/.gitkeep`
- `packages/shared/.gitkeep`
- `packages/ui/.gitkeep`
- `infrastructure/monitoring/.gitkeep`
- `infrastructure/scripts/.gitkeep`
- `infrastructure/networking/.gitkeep`

## 5 November 2026 pre-push review

Reviewed the Phase 00 files and existing Git history for credentials, environment files and internal infrastructure identifiers. Removed two environment-specific Firebase project identifiers from the active and historical documentation and refreshed the archive checksums. The two Gitleaks matches in the archive manifest were verified SHA-256 file checksums. GitHub reported the configured origin as public, so the private-repository push is pending.

## 5 November 2026 — Phase 01 quality setup

Phase 00 was subsequently pushed to the existing public repository with the owner's explicit instruction at `74fa0f1`. This entry records local work against that revision. The owner requested the engineering-quality addendum for Phases 01–05. At intake the repository had no executable application, migrations, tests or CI workflow.

- Implemented the local part of L01-5: pinned pnpm tooling, TypeScript, Biome, Vitest, Playwright desktop/mobile, a disposable PostgreSQL launcher, security-contract regression tests and a bounded PR-only workflow. Updated active instructions, roadmap, phase plans, backlog, setup and acceptance rules. See the [milestone report](../docs/reports/phase-01-report.md).
- Ran frozen install, typecheck, lint, unit/contract (35 passed), PostgreSQL integration (1 passed) and browser isolation (2 passed). An initial lint run suggested template literals; applied the suggestions and reran cleanly. Repeated the DB integration with conflicting parent connection settings. The fixture used its own database and stopped successfully.
- Ran dependency audit, redacted Git history and working-change secret checks, Bash syntax, actionlint and local documentation checks. Local Playwright installation pruned an older cached WebKit build; restored that build and documented the cache-preserving install command.
- Outstanding: hosted CI run and approved allowance, migrations/restore, product validation, login/session/RBAC/API tests and seven-section dashboard/inventory E2E. Issue an evidence update after each significant milestone. Changes are local; the Phase 01 acceptance gate is open.

## Phase 01 foundation · database milestone · 5 November 2026

Created phase-01/foundation at 74fa0f1 with the quality addendum working tree intact. Added transactional identity and inventory migrations, restricted web grants, membership revocation triggers and an offline staff approval script. Ran pnpm test:integration on PostgreSQL 18.3: three tests passed, including runtime permissions, case-insensitive names and cross-environment/disabled-target constraints. A populated v1 upgraded twice and restored into a second database with identity and migration history intact. Browser/auth checks pending.

### Database policy reconciliation and identity milestone

The previous isolation run used Homebrew PostgreSQL 18.3 through initdb/pg_ctl and a private Unix socket. The temporary managed-only direction stopped the next local run. The owner then explicitly selected native PostgreSQL for development and automated tests, with Postgres.app preferred on macOS. Implemented that final policy and removed the managed-host connection path. No DigitalOcean resource was contacted.

On the native database, the real login callback issued opaque sessions for approved synthetic staff. Desktop tests passed for unapproved accounts, signature/nonce/email verification, logout replay, idle and absolute expiry and membership revocation. The first inventory browser run exposed stale list data after a successful create. Corrected the refresh dependency and added independent readback of the saved revision. Full regression follows.

### Inventory, dashboard and Phase 01 gate · 5 November 2026

Migrated the final setup to native PostgreSQL 18 and tested its two distinct lifecycles. The developer launcher used a persistent kbean_development DB and was stopped after a signed-in overview check. Native tests ran in a fresh kbean_test cluster with SCRAM, owner-only socket, restricted identities, automatic migrations, populated upgrade/replay and a dump restored into kbean_test_restore. No local Docker, cloud connection, production account or live provider was used. Prepared a PostgreSQL 18 GitHub Actions service and validated workflow syntax; hosted execution is pending.

Ran pnpm typecheck, lint, frozen install, optimized build, test:unit (40), test:e2e (18), test:db (2 DB tests plus 28 authenticated browser tests), job:check, dependency audit, secret scans, OpenAPI validation and actionlint. Final tests: 88 passed, zero failed/skipped. Real app tests verified both viewports, login/denials/revocation/expiry, inventory create/edit/readback, concurrency, scope, roles and error handling. Separate component fixtures verified slow/error/empty transitions. The stale list discovered during the first real create/edit run was fixed and the complete suites rerun. See the [consolidated acceptance report](../docs/reports/phase-01-report.md) and [native setup](../docs/database/local-development.md). Stop for owner review. Changes remain uncommitted.

The final desktop and mobile database suite deliberately held a lock until the actual web query timed out, verified the loading/error UI, released the lock and recovered through the retry button. All 28 DB-backed browser cases passed. The CI service branch also passed its migration and integration path locally over isolated loopback TCP. No hosted run was triggered.

## Phase 02 baseline and checkpoints A/B · 6 November 2026

Owner authorized controlled local Phase02. Inspected clean phase-01/foundation at733af8d; fetched reviewed main f9423c0, identical source tree, merged PR#1. GitHub workflow41954771693 completed successfully. Re-executed 88 baseline checks (40 unit,18 database-free browser,2 PG,28 authenticated browser), typecheck/lint/build. Created phase-02/availability-monitoring from origin/main and removed its inherited upstream to prevent accidental main push. No Phase02 publication approval exists.

Implemented monitoring/probe.mjs, model.mjs, runner.mjs and store.mjs; migration003, restricted collector role/bootstrap, offline approval/maintenance command and explicit job fixture launcher. Actual loopback HTTP/TLS checks, exact fixture capability, production URL/public DNS/address validation, pinned lookup, certificate verification, no redirects, 64KiB limit, timeouts, redacted failure categories. Live entrypoint still returns disabled/zero attempts. Unit checkpoint:72 passed, including actual HTTP/TLS; type/lint follow-up underway. Native migration upgrade/replay/dump/restore passed. Seven PG tests passed including 20 real fixture targets, four-request concurrency,40 attempts, overlap/duplicate no-call, lock loss/crash unknowns, transitions/history/grants/rollback/retention. No cloud resources or persistent development records changed.

Defects found and corrected: pg JavaScript array serialization required explicit JSON for fixture history; pg date parsing in the machine timezone shifted historical UTC dates; raw retention boundaries must preserve full daily summaries across repeated runs. Additional review is strengthening aggregation to one worst-required-endpoint result per service slot, preserving historical required flags, and processing old raw backlog after long collector outages. These follow-ups require another final run before checkpoint closure.

Checkpoint C is in progress: endpoints/status API and Overview/Application Status/configuration UI are connected. Initial36 authenticated browser cases passed at1440x900 and360x800, including all28 Phase01 regressions and8 new monitoring cases. The inventory timeout regression moved from the former Application Status placeholder to Settings; a new real PostgreSQL timeout/retry test covers the monitoring page. Initial visual review found detail-panel padding and off-screen history presentation issues; corrections precede final screenshots. API/OpenAPI and technical documentation reconciliation are still in progress. No passing contract-only check is counted as live app evidence.

## Phase 02 checkpoints C/D and local acceptance gate · 6 November 2026

Final implementation connects the existing five endpoint/status contracts to real stored observations. Updated apps/web monitoring server/component, route/dashboard/inventory/CSS, OpenAPI, shared monitoring modules, migration003/native identity tools, fixture runner and tests. Updated permanent Git instructions, roadmap, model/schema/security/setup/test docs; added ADR0008, operations guide, A–K acceptance report, PR draft and selected desktop/mobile screenshots.

Final unique results:75 unit/security-contract/executor,8 real PostgreSQL,18 database-free browser and36 authenticated browser tests passed (137 total, zero failures/skips). The focused stored-evidence visual rerun passed two existing cases without increasing the unique total. Typecheck, lint (no warnings), optimized build, frozen install, dependency audit, OpenAPI validation, shell syntax and diff whitespace passed. The real20-target/40-attempt test completed in8.997s with concurrency<=4. Explicit fixture command completed four finite runs of four attempts each and cleaned up. Default command remained disabled with zero attempts.

Final review corrected worst-required-endpoint service arithmetic, historical required periods, run/slot FK integrity, long-gap retention and stalled-DNS classification. A new in-flight lock-loss test confirms cancellation without committed checks. The expanded retention test verifies61-day gaps, repeated rollup and12-month expiry. A browser test initially selected the full20-monitor fixture service and received the correct409 limit response; it now creates its own service. Cross-environment target IDs and URL-change approval revocation pass on the actual API. Screenshots were visually reviewed; fixtures are synthetic, not live health.

Gitleaks history clean. All tracked/new nonignored source files reviewed: only the two unchanged, already-reviewed archived SHA-256 checksum matches at manifest lines23/52, no new secret exposure. No environment credentials or traces are staged. Existing Phase01 hosted workflow41954771693 passed; Phase02 hosted CI awaits authorized push/PR. No cloud/live endpoint/IAM/paid API/deployment action occurred. Development data was preserved; all task-owned fixture resources stopped. The feature branch remains uncommitted/unpushed at reviewed main f9423c0. Owner review and publication permission are the next gate; no Phase03 work.


## Phase 02 publication authorization

The owner approved the proposed commit, feature-branch push and review PR. Rechecked the branch, diff and secret boundary before publication. Implementation and test evidence are unchanged from the local acceptance report; only authorization records were updated. Merge, live monitoring, cloud changes, deployment and Phase 03 remain outside this approval.

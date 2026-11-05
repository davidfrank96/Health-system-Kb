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

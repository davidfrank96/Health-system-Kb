# Lean Phase 03: Infrastructure and manual metrics

Target: 19 February 2027. Status: authorized for local implementation.

## Dependencies

Phase 01–02 gates; current source permission and zero-cost evidence.

## Scope

L03-1 through L03-4: DO first, cost gate, manual snapshot/CSV, optional eligible free adapters.

## Verification

Default-disabled/no-call, units/429/partial/late/cardinality caps, atomic preview/import/provenance/env/formula tests.

## Acceptance

No incremental paid feature; unverified sources manual/disabled; actual source/age visible; owner reviews scopes and shared allowances.

## Rollback

Disable affected adapter, preserve old/manual observations and usage evidence; no paid fallback or new feature enablement.

## Completion record

Record requirements, files, commands/results, unresolved defects, cost/permission evidence, limitations and approved actions in the build log. Stop at phase boundary; no deployment/commit/push is implied.

Apply the [engineering workflow](../../AGENTS.md) to every significant change. Provide milestone evidence in the build log and a short progress update to the owner. Before closing Phase 03, complete `docs/reports/phase-03-report.md` using the [A–F report and acceptance requirements](../../docs/testing/test-strategy.md#phase-report-and-acceptance). Record the verification above against delivered behavior and stop for review.

## Execution checkpoints

A. Fix the supported metric dictionary, exact resource scopes, expiry checks and per-request reservations. Exercise the adapter exclusively through controlled transports.

B. Apply migration 004 after the accepted baseline. Verify separate ingestion privileges, atomic preview/confirmation, corrections and retention using disposable PostgreSQL.

C. Connect authenticated routes and responsive views to stored data. Exercise service scope, historical views and imports through the running application.

D. Run regressions, build, audit and scan. Record evidence, unresolved items and the review description before publication.

## Local review

See the [acceptance report](../../docs/reports/phase-03-report.md), [checkpoint evidence](../build-log.md) and [prepared PR description](../code-review/phase-03-pr.md). Hosted CI follows authorized publication.

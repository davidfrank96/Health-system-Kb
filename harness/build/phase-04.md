# Lean Phase 04: QA, incidents and reports

Target: 12 March 2027. Status: not started; not authorized.

## Dependencies

Foundation/availability/data gates; existing no-cost QA agreement.

## Scope

L04-1 through L04-3: existing QA/manual intake, internal incidents/maintenance, daily/weekly/monthly/QA summaries and CSV.

## Verification

Synchronous HMAC/duplicate/replay/env tests, incident lifecycle/revision, sample maintenance reconciliation, bounded report/export safety.

## Acceptance

No QA runner, public publication, report engine or delivery infrastructure; traceable manual/source data and correct scoped reports.

## Rollback

Disable offending intake path/config, keep source identities/evidence, revert compatible code; no queued or untracked deliveries.

## Completion record

Record requirements, files, commands/results, unresolved defects, cost/permission evidence, limitations and approved actions in the build log. Stop at phase boundary; no deployment/commit/push is implied.

Apply the [engineering workflow](../../AGENTS.md) to every significant change. Provide milestone evidence in the build log and a short progress update to the owner. Before closing Phase 04, complete `docs/reports/phase-04-report.md` using the [A–F report and acceptance requirements](../../docs/testing/test-strategy.md#phase-report-and-acceptance). Record the verification above against delivered behavior and stop for review.

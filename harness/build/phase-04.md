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

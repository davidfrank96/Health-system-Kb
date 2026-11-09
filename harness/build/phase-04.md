# Lean Phase 04: QA, incidents and reports

Target: 12 March 2027. Status: authorized for controlled local development on phase-04/qa-incidents-reports.

## Dependencies

Accepted PR #3 (4156c0b). A real sender agreement gates live activation.

## Scope

L04-1 through L04-3: existing QA/manual intake, internal incidents/maintenance, daily/weekly/monthly/QA summaries and CSV.

## Ordered checkpoints

1. A · Extend the accepted database with migration 005. Bind exact raw-body HMACs to independently configured synthetic service/environment scope. Test expiry, rotation, duplicate/reused identities, counts, transactional rollback and staff import provenance before building consumers.
2. B · With scoped services and QA identities established, implement append-only incident history, revisions, evidence references and future maintenance edits. Exercise concurrent edits, overlap, cancellation and the existing slot calculation against PostgreSQL.
3. C · Compose reports from slot counts, raw/retained metrics, QA and incident history; bound periods and exports. Wire the three sections and overview to authenticated APIs. Verify rolling/calendar UTC periods, formula escaping and actual browser workflows at desktop, tablet and mobile widths.
4. D · Run all prior suites, native upgrade/dump/restore, build, lint, audit and secret scan. Record executed evidence and synthetic screenshots, reconcile the API and operating guide, prepare the PR description and stop for review.

## Verification

Synchronous HMAC/duplicate/replay/env tests, incident lifecycle/revision, sample maintenance reconciliation, bounded report/export safety.

## Acceptance

No QA runner, public publication, report engine or delivery infrastructure; traceable manual/source data and correct scoped reports.

## Rollback

Disable offending intake path/config, keep source identities/evidence, revert compatible code; no queued or untracked deliveries.

## Completion record

Record requirements, files, commands/results, unresolved defects, cost/permission evidence, limitations and approved actions in the build log. Stop at phase boundary; no deployment/commit/push is implied.

Apply the [engineering workflow](../../AGENTS.md) to every significant change. Provide milestone evidence in the build log and a short progress update to the owner. Before closing Phase 04, complete `docs/reports/phase-04-report.md` using the [A–F report and acceptance requirements](../../docs/testing/test-strategy.md#phase-report-and-acceptance). Record the verification above against delivered behavior and stop for review.

Checkpoints A–D are recorded in the [build log](../build-log.md). The [acceptance report](../../docs/reports/phase-04-report.md) and [draft PR](../code-review/phase-04-pr.md) are ready for local owner review. Live QA, hosted CI and publication remain outside this local gate.

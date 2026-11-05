# Phase 04: QA, alerts and reporting

Target: 12 March 2027. Status: not started; not authorized.

## Dependencies

Phase 02–03 gates; QA owner agreement Q10; alert destinations Q12.

## Scope and deliverables

P04-01 through P04-04: QA imports, security references, alert lifecycle/outbox, scheduled reports/exports, final admin workflows.

## Verification

HMAC/replay/collision/env tests, outbox concurrency/retry tests, alert suppression/recovery and CSV/HTML/JSON access tests.

## Acceptance gate

Existing QA/security tools preserved, one alert authority per condition, no duplicate durable events, report coverage/provenance retained.

## Rollback implications

Pause sender intake/delivery/schedules, retain inbox/outbox, resume using dedupe keys; revoke leaked links and document delivery ambiguity.

## Completion evidence

Record implemented features and requirement IDs, changed files, commands/pass-fail results, unresolved defects/security findings, authorized deployment changes, limitations, owner approvals and next-phase dependencies in the build log. Stop at this phase boundary.

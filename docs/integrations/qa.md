# Existing QA integration

No second QA runner, paid sender or separate consumer service. Prefer an already available signed webhook at no incremental cost, otherwise existing scoped read API in the finite job or authorized manual JSON import. Sender capability/pricing is unverified; contract below is a proposal for agreement, not an existing deployed protocol.

## Implemented fixture webhook; live contract pending

`POST /api/v1/webhooks/qa/runs`, JSON <=128 KiB. Headers: X-Kbean-Key-Id, X-Kbean-Timestamp (integer Unix seconds), X-Kbean-Event-Id (UUID), X-Kbean-Signature (`v1=` + hex HMAC-SHA256). Sign exact bytes `timestamp + "." + eventId + "." + rawBody`; constant-time verify and reject outside ±300s. Redelivery keeps event ID/body but uses a current signature timestamp. Bind key to integration, authorized services and environment independently of payload values. No browser session/CSRF is used for sender authentication.

Web app validates then atomically inserts the final QA run, event ID/digest and audit. Return 201 after synchronous commit; 200 for identical duplicate; 409 for reused ID/run with conflicting content. No 202 async queue. Unique integration+event_id and integration+source_run_id prevent duplicate runs. Terminal-event-only MVP: changed terminal results require manual audited correction/future version, not silent overwrite. Failed DB transaction returns 503 for sender retry. At most two active keys during a reviewed 24h rotation overlap; secrets are web-only.

Payload: schemaVersion=1, sourceRunId, serviceId, environment, suiteName, start/completion time, duration, terminal passed/failed/error/cancelled state, passed/failed/skipped/flaky counts, <=20 failure summaries, <=10 approved HTTPS report/evidence links, <=20 short external security finding references and optional application version. Flaky is a subset of executed cases, not an extra total. Validate completion>=start and count/status consistency. Never ingest raw customer logs, crash stacks or source credentials. Links are not fetched automatically.

## Manual/polling fallback

`POST /api/v1/qa/imports` requires Operator/Admin, CSRF and idempotency key, the same normalized payload plus source reference. Store `source_method=manual`, actor, entry/observation times and digest; do not pretend sender verification occurred. An approved existing read API may be polled >=15m within cost/time caps using run-level dedupe, with method api. All three paths preserve provenance and cannot override service/environment membership.

Single-process limits: 30 events/min/sender and 60/min overall; body and DB time limits bound synchronous work. Reuse existing QA report access and security tooling; no additional alert channel or paid scan. Test raw-byte tamper, signature/replay, wrong service/env, duplicate races, digest collision, 503-before-commit, oversized findings, unsafe evidence link, manual attribution and zero-cost gate. Owner must confirm suite schedules for stale labels; no assumed daily test execution.

The local browser harness creates a fresh random current/previous secret and a single fixture service scope. Keys never enter client JavaScript or screenshots. The receiver requires fixture mode, test tier, the disposable database name and a configured sender; all other setups return 503. Manual intake remains available with a staff session. No read adapter is implemented: ownership, endpoint, cost, credentials and schedules are unverified. A changed event body conflicts even when JSON whitespace is the only difference. A new event for an identical normalized run acknowledges the existing run. See the [local workflow](../operations/qa-incidents-reports.md).

## Local configuration

For the controlled sender, run `corepack pnpm build` followed by `corepack pnpm test:db`. The harness sets `KBEAN_QA_FIXTURE_CONFIG` in the app process with a source name, one environment, an explicit service UUID list, and one or two keys with ID, generated 32-byte hex secret and UTC validity interval. Preserve the source name across a rotation so event deduplication still recognizes redelivery. Never add the configuration to a checked-in file. `KBEAN_QA_EVIDENCE_HOSTS` is an exact comma-separated hostname allowlist for references; the default is empty. `KBEAN_QA_CADENCES` maps a serialized [environment, service ID, suite] tuple to its reviewed positive cadence in minutes. Leave it unset where the schedule is unverified. The disposable harness config is built in tests/support/local-stack.mjs; production cannot be enabled with a test key.

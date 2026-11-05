# Existing QA integration

No second QA runner, paid sender or separate consumer service. Prefer an already available signed webhook at no incremental cost, otherwise existing scoped read API in the finite job or authorized manual JSON import. Sender capability/pricing is unverified; contract below is a proposal for agreement, not an existing deployed protocol.

## Proposed webhook

`POST /api/v1/webhooks/qa/runs`, JSON <=128 KiB. Headers: X-Kbean-Key-Id, X-Kbean-Timestamp (integer Unix seconds), X-Kbean-Event-Id (UUID), X-Kbean-Signature (`v1=` + hex HMAC-SHA256). Sign exact bytes `timestamp + "." + eventId + "." + rawBody`; constant-time verify and reject outside ±300s. Redelivery keeps event ID/body but uses a current signature timestamp. Bind key to integration, authorized services and environment independently of payload values. No browser session/CSRF is used for sender authentication.

Web app validates then atomically inserts the final QA run, event ID/digest and audit. Return 201 after synchronous commit; 200 for identical duplicate; 409 for reused ID/run with conflicting content. No 202 async queue. Unique integration+event_id and integration+source_run_id prevent duplicate runs. Terminal-event-only MVP: changed terminal results require manual audited correction/future version, not silent overwrite. Failed DB transaction returns 503 for sender retry. At most two active keys during a reviewed 24h rotation overlap; secrets are web-only.

Payload: schemaVersion=1, sourceRunId, serviceId, environment, suiteName, start/completion time, duration, terminal passed/failed/error/cancelled state, passed/failed/skipped/flaky counts, <=20 failure summaries, <=10 approved HTTPS report/evidence links, <=20 short external security finding references and optional application version. Flaky is a subset of executed cases, not an extra total. Validate completion>=start and count/status consistency. Never ingest raw customer logs, crash stacks or source credentials. Links are not fetched automatically.

## Manual/polling fallback

`POST /api/v1/qa/imports` requires Operator/Admin, CSRF and idempotency key, the same normalized payload plus source reference. Store `source_method=manual`, actor, entry/observation times and digest; do not pretend sender verification occurred. An approved existing read API may be polled >=15m within cost/time caps using run-level dedupe, with method api. All three paths preserve provenance and cannot override service/environment membership.

Rate limit proposal 30 events/min/sender and 60/min overall; body and DB time limits bound synchronous work. Reuse existing QA report access and security tooling; no additional alert channel or paid scan. Test raw-byte tamper, signature/replay, wrong service/env, duplicate races, digest collision, 503-before-commit, oversized findings, unsafe evidence link, manual attribution and zero-cost gate. Owner must confirm suite schedules for stale labels; no assumed daily test execution.

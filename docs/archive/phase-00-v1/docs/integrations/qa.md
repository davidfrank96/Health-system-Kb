# QA and security reference contract

Status: proposed protocol, not an assertion about the existing QA platform. Confirm sender support before implementation; otherwise use a scoped read-only polling adapter through the same normalization path. Do not execute tests in the Health System.

## Signed v1 event

`POST /api/v1/webhooks/qa/runs`, JSON <=256 KiB. Required headers: `X-Kbean-Key-Id`, `X-Kbean-Timestamp` (integer Unix seconds), `X-Kbean-Event-Id` (UUID), `X-Kbean-Signature` (`v1=` followed by lowercase hex HMAC-SHA256). Sign exact bytes `timestamp + "." + eventId + "." + rawBody`. Verify constant-time against the active per-environment key; reject timestamps outside ±300 seconds. Re-delivery uses a current timestamp/signature and the same event ID/body. Allow two keys during a documented 24h rotation overlap; store only secret references.

Identity from key ID is bound to an integration, allowed assets and one environment. The payload cannot override that binding. Store `(integration_id,event_id)` uniquely with body digest and durable job in one transaction. Return 202 after durable acceptance, 200 for identical duplicates, 409 for reused ID/different digest; retain event dedupe for 90 days. Run uniqueness `(integration_id,source_run_id)` persists with retained runs, so old event IDs cannot create duplicate runs. Reject changed terminal results unless a future version explicitly defines revisions. See [OpenAPI](../api/openapi.yaml) for fields.

Payload includes schema version, source run ID, suite/application asset/environment, start/completion timestamps, duration, terminal status, passed/failed/skipped/flaky counts, bounded failure summaries and allowlisted HTTPS evidence links, optionally deployment/version. Flaky is a subset of executed cases, not an extra case count; failed status must agree with failures unless an explicit infrastructure error status is used. Validate completion >= start and duration within documented clock tolerance. Maximum 50 summaries and 20 evidence links; no raw logs, screenshots or customer records.

## Failure behavior and tests

Rate limit proposal: 60 events/min per sender, 300/min global, bounded queue depth. Invalid events produce safe codes, never echo signing material. Sender retries transient 429/5xx with backoff; no automatic secret broadening. Polling defaults to 15m with a watermark overlap and run-level deduplication. Required tests: altered whitespace/raw bytes, wrong key, old/future timestamp, cross-environment signed event, duplicate races, payload collision, crash after commit, large body, unsafe link and conflicting final run.

QA owns test execution and raw evidence. Health System owns normalized ingestion health and approved alert correlation. Wazuh/Eramba/vulnerability findings are external references with severity, source ID, affected asset and access-controlled URL only; no duplication of confidential logs. Retention and notification authority require owners. No email/Slack destination or sender contract is confirmed.

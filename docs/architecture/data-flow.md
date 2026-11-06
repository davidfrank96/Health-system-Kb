# Lean data flows and execution limits

Phase02 implements the local availability path. Provider/manual/QA flows below remain planned. Store UTC observation time, collection/entry time and ingestion time separately, with source and environment attribution.

## Finite scheduled run

App Platform starts the job every 15 minutes in UTC → validate configuration and cost approvals → acquire a nonblocking PostgreSQL advisory lock on a dedicated non-pooled connection → register unique `(deployment_environment, scheduled_slot)` collection run → probe approved endpoints → collect eligible metrics → store results and state transitions → bounded rollup/retention work → mark completion, release lock and exit. No background queue, distributed lease scheduler or always-running timer is required.

The lock prevents overlapping invocations. Losing its connection aborts outbound work and commits; uniqueness on endpoint/slot and provider sample keys still protects against duplicates. A duplicate invocation for a completed/running slot exits without sending requests. Do not reclaim or retry a failed slot automatically; record gaps and run the next scheduled slot. This favors bounded cost over historical reconstruction. Platform retry behavior and available scheduled-invocation timestamp must be verified before deployment. If no stable slot metadata exists, accept only runs within 2 minutes of the UTC quarter hour, use that slot, and skip later arrivals; never relabel a delayed run as historical evidence.

Limits proposal: 20 endpoints, four concurrent requests, ten-second total timeout per attempt, one retry with 1–2s jitter only for transient failures, and a five-minute whole-process deadline. Do not start new requests during the last 20 seconds. Maximum 40 probe attempts per run, up to 96 runs/day; adapters receive a separate approved request/series budget within the same deadline. Retry-After beyond remaining time causes skip, not a sleeping billable container. No retries for credentials/cost denial; no catch-up probe bursts. A minimal slot record and unique result writes are durable; crashes leave unfinished items unknown.

Terminate network connections, timers and DB clients at exit, including error paths. Establish an outer platform execution timeout if supported; otherwise verify process hard-exit behavior and operational stop procedure. An application watchdog is not a provider billing guarantee. A missing scheduler run cannot be prevented by a database counter, but views derive missing expected slots and stale run status.

## Direct HTTPS executor

Use only owner-approved HTTPS host/path/port 443 targets, safe GET health endpoints and expected status codes. No user-supplied URL at check time, userinfo, cookies, target credentials or secret query strings. Disable redirects in MVP; approve a canonical destination instead. Resolve all A/AAAA addresses, reject nonpublic/link-local/loopback/metadata/private/reserved and IPv4-mapped equivalents, pin the validated address for the connection, verify TLS/SNI for the approved host and revalidate for every attempt. Block IP literals by default. Never follow a redirect or re-resolve inside an uncontrolled fetch path. Bound response bytes to 64 KiB and discard bodies after evaluating the approved response rule. These rules must be tested at the actual Node HTTP client; an allowlist UI alone is insufficient. Private network targets are deferred for separate review.

A completed request can record success or an endpoint failure; a scheduler, DNS infrastructure, DB, quota or executor-policy failure records unknown/error and does not confirm service downtime. Distinguish per-target DNS/network failure from evidence of a shared resolver/network outage; mark uncertain shared failures unknown. See [monitoring semantics](monitoring-model.md).

## Metrics and imports

Before each provider request verify enabled flag, current permission/cost evidence and remaining bounded allowance. Reserve worst-case usage in a DB transaction, release unused reservation only when safe, and count retries/pages/errors conservatively. If price, shared consumption or response cardinality cannot be bounded, skip and show disabled/unknown-cost. Store only allowlisted numeric descriptors and dimensions; no raw cloud responses. Duplicate/late data cannot overwrite a newer observation.

Manual JSON or CSV → authenticated operator scope check → validation preview without writes → confirmed submit with digest and idempotency key → atomic observations plus audit. Imported_at never replaces observed_at. Corrections supersede observations with actor/reason; they cannot rewrite HTTPS results. See [import contract](../integrations/manual-imports.md).

## QA, incidents and reports

Small signed QA event is verified and normalized synchronously in the existing web app. Commit event identity/digest, final run summary and audit together; return 201 only after commit, 200 for identical duplicate, 409 for conflict. No async inbox consumer is needed. Existing no-charge polling, if selected, runs in the same scheduled job. Evidence links are never fetched automatically.

Incident/maintenance updates are authorized database transactions. Observed downtime/recovery records are generated from the confirmation rules and remain distinct from operator incident narratives. Reports are bounded read queries over checks/daily summaries/incidents/QA, returned inside the app or CSV directly; include generation time, method, coverage and calculation version. No persistent report queue, artifact store, delivery outbox or notification service. Long/unbounded reports are rejected; pagination or narrower windows keep the request bounded.


## Phase 02 runtime boundary

The reusable runner currently accepts only an approved disposable test database and exact controlled fixture authority. The default entrypoint sends no requests, and no environment toggle enables live probing. The collector connection owns the advisory lock for its entire lifetime; run registration commits before outbound work. The final check/state/event/rollup transaction either commits together or rolls back. Endpoint configuration is rechecked under row lock before storing a result. Lost lock connections abort work and leave an honest unfinished run. API handlers use the web identity and have no probe or owner-approval capability. See [commands and implemented limits](../operations/availability-monitoring.md).

# Data flows and durable processing

All flows are proposed; timestamps are UTC RFC 3339 and stored as PostgreSQL timestamptz. Environment and integration identity come from authorized configuration, not unchecked incoming payloads.

## Provider collection

Scheduler selects enabled, approved capabilities whose next_due_at has passed → creates a unique `(integration, capability, scheduled_for)` job → claims a lease → reads scoped provider API → validates allowed metrics/dimensions → normalizes units → transactionally upserts samples and sync outcome → schedules next run. Retain provider observation interval, observed_at, collected_at and ingested_at separately. Late data can repair historical buckets but cannot overwrite newer current values. An unchanged observation time is not a fresh observation.

Use short transactional `FOR UPDATE SKIP LOCKED` claims, never hold a DB transaction across HTTP. Start with a 60-second lease, heartbeat every 20 seconds and a fencing token: only the current lease holder may finalize. Bound HTTP calls to 15 seconds, each job to 120 seconds, and parallel calls to two per integration/four total; all are tunable proposals. Retries: 3 attempts, exponential delay plus full jitter, obey Retry-After and quota budget. Auth/permission errors pause the affected capability; five transient failures open its circuit for five minutes. Other providers continue. Unique ingest keys and transactional completion protect against at-least-once execution. Expired leases are reclaimable and shutdown releases or expires work safely.

## Availability

Kuma checks an approved target every 60 seconds; Prometheus scrapes every 30 seconds; worker reads bounded ranges with a two-minute overlap and idempotent interval keys. Map stable monitor identity to approved asset IDs; never expose `monitor_url` labels publicly. Missing scrape, stalled probe execution or unavailable source recency produces unknown coverage. Persistent gauge values alone do not prove a new check. Phase 03 must validate heartbeat semantics against the pinned Kuma version; absent proof, show unknown and defer publishable uptime rather than invent certainty.

Use half-open UTC intervals, deduplicate overlaps, preserve correction versions and aggregate daily before raw retention expiry. Keep provenance and unknown duration. See [monitoring model](monitoring-model.md).

## QA and notifications

Webhook checks size/signature/timestamp before JSON normalization, validates integration-bound asset/environment, and commits immutable event ID, digest and processing job before returning 202. Duplicate identical delivery returns 200; changed body with the same ID returns 409. Worker materializes runs transactionally. No fetching evidence URLs during ingestion. Polling fallback uses the same normalized idempotency key.

Alert evaluation runs only on valid observations. A transactional outbox records transitions and delivery intents with a unique `(alert,event_version,destination)` key. Delivery retries are bounded and visible; provider delivery IDs are saved when available. At-least-once transport can still duplicate a message after an ambiguous timeout; reconcile receipt when supported. One authority per condition prevents existing provider/Kuma/application notifications duplicating each other.

## Publication and reports

Operator edits an internal incident → authorized publisher previews a separate sanitized public revision → explicit publish action writes approved text/component IDs/status/time to the publication schema and audit log in one transaction. Later internal edits do not change public text. Publish/retract are versioned and auditable; retraction cannot recall already delivered notifications.

Worker produces immutable report snapshots with period, environment, generation time, source timestamps, coverage and calculation version. HTML/JSON/CSV use the same snapshot. Exports enforce authorization again at download; prevent CSV formula injection and escape HTML. Signed download links, if adopted, expire in five minutes and point only to private approved storage. Never fetch arbitrary report URLs on behalf of browsers.

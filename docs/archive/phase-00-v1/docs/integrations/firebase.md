# Firebase integration design

Candidate project names in [inventory](../assets/inventory.md) are user-supplied and unverified. Bind distinct staging/production identities to verified project numbers. Never use privileged Firebase Admin SDK credentials or read user/application documents to infer health.

For Functions, Firestore and Storage, reuse GCP Monitoring capabilities after descriptor discovery. Functions generation and resource type affect metrics. Authentication and App Check coverage is explicitly unverified; absence of an API-backed metric is unsupported, not healthy. Operational collection defaults to 15–60m with source-specific lag; validate quota and cost before enabling.

## Crashlytics option

[Firebase documents](https://firebase.google.com/docs/crashlytics/bigquery-export) daily BigQuery exports and optional streaming; initial batch export can take up to 48 hours. Stream availability and billing must be checked for the actual project. Daily batch is the initial proposal. Store only aggregate reliability counts and approved evidence references; never ingest stacks, device identifiers or user fields by default.

Prefer an existing restricted aggregate view. [BigQuery query permissions](https://docs.cloud.google.com/bigquery/docs/running-queries?hl=en) require data-view access and query job creation: propose Data Viewer on approved tables/views and Job User on the dedicated approved query project. This is read-only with respect to monitored source data but creates billed query jobs; the owner must explicitly approve this exception to literal no-provider-writes. If the policy forbids it, defer Crashlytics or consume an existing approved aggregate export. Do not create datasets/views/exports or enable streaming during discovery.

Bound each query with partition filters, maximum bytes billed, timeout, daily quota and a cost ceiling agreed by the billing owner; record last export and data-period timestamps separately. Provisional stale threshold is 48h for steady-state daily data. Tests cover export lag, initial empty dataset, streaming/batch overlap, corrected daily records, denied views, schema changes, absent session denominator and privacy redaction. Do not claim crash-free percentages when session/user denominators are unavailable. Source telemetry remains in Firebase/GCP; normalized Health System records live on DO, subject to owner acceptance of this interpretation.

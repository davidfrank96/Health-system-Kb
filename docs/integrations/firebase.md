# Firebase without new paid features

The staging and production projects are inventory candidates. Verify actual resource identity/environment and supported existing telemetry; no Firebase Admin SDK credentials, user documents or business data are required.

Use existing no-additional-charge operational measurements only after the [GCP cost gate](gcp.md) and permissions review. Functions generation, Firestore/Storage descriptors, Authentication and App Check coverage must be established rather than invented. Absent or unavailable metrics remain unsupported. Optional approved cadence >=15m and source-specific lag; no assumption of live reliability data.

**No new BigQuery exports, datasets, streaming or query jobs in MVP.** Existing Crashlytics aggregates can be manually entered/imported if already available without triggering new paid processing. Keep source period and observed_at; do not label daily reliability as live uptime or compute crash-free rates without a valid denominator. Any future automated export/query path needs a separate scope/cost revision, not an exception hidden in an adapter.

Tests: no automatic call while disabled, expired cost evidence, source lag, missing denominator, environment mismatch and manual provenance. Leave existing Firebase/GCP alerts, IAM and exports unchanged.

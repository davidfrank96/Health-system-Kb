# Manual metric entry and CSV contract

Manual fallback is a first-class MVP path for unsupported or unproven-cost infrastructure collection. It never changes HTTPS health_checks or automatic downtime records. Operator/Admin may import only their authorized service/environment; Viewer cannot mutate.

Manual entry `POST /api/v1/metrics/snapshots` and CSV `POST /api/v1/metrics/imports` use the same validation. Required fields: service_id, environment, provider, metric_name, unit, aggregation, finite numeric value, observed_at (UTC), source_reference and note. Metric allowlist defines unit, aggregation, supported dimensions (none by default) and age policy. Imported source URLs are stored as safe references only; no server fetch. Record entered_by, imported_at, source_method (`manual` or `csv`), batch ID/digest and optional superseded observation ID. Automatic readings remain `https` or `provider_api` and cannot be claimed by the client.

## CSV wire format

UTF-8 CSV, first header row exactly `service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_reference,note`; comma delimiter, standard quoted fields with doubled quotes. No XLSX, macros, remote files or arbitrary extra columns. Limit 256 KiB, 500 data rows, 4 KiB/field, one environment per batch. Accept LF/CRLF; reject ambiguous encodings, duplicate/missing headers, malformed quotes, NaN/Infinity, invalid units/IDs, future time >2m, and observations older than 30d. Unknown service/metric is an error, not an automatic creation. Source reference is a short plain identifier or approved HTTPS link, never a credential-bearing URL.

Preview (`dryRun=true`) validates entire body and returns counts, row errors and normalized digest without persisting data. User confirms the same body with `dryRun=false`, `X-Preview-Digest` and Idempotency-Key; server revalidates and compares normalized digest, rechecks authorization and inserts batch+rows+audit atomically. No partial success and no unbounded error echo (maximum 50 row errors). Empty file is invalid. A changed payload under the same key returns 409; identical replay returns original batch result. The entry form uses the same digest preview on a one-row CSV-equivalent normalized payload or explicit confirmation before direct single-entry submission.

Duplicates: unique batch digest/idempotency identity scoped to actor/environment prevents repeated upload; current observation identity includes service, provider, metric, resource if applicable, observed_at and staff/provider provenance. Conflicting readings at the same time require an explicit correction reason/supersedes ID, never silent last-write-wins. Manual content is a staff assertion, not provider-verified truth. Display observation age and import age separately; importing an old value does not refresh its observation time.

CSV exports quote fields and prefix dangerous spreadsheet formula-leading strings (`=`, `+`, `-`, `@`, tabs/control characters) appropriately; numeric values stay typed and must not be generated from arbitrary formula strings. HTML escapes all text. No evidence URL fetch or HTML from source files. Tests include cross-env rows, forged source_method, stale timestamps, duplicate/collision, all-or-nothing rollback, preview changed body, huge row and formula injection.

## Phase 03 implementation

The form accepts camelCase JSON and CSV accepts the exact snake_case header above. Preview includes normalized readings and up to 50 row errors. Plain references and query-free HTTPS paths on the documented provider documentation hosts are eligible. Observation identity groups manual and CSV assertions together for conflict detection. Correct either through the manual form. Provider readings remain resource-scoped and read-only. See [operator workflow](../operations/infrastructure-health.md).

## Manual QA

The QA fallback accepts one terminal run, via a staff form or normalized JSON plus a required source reference. Unlike the metric CSV path it commits synchronously and has no preview token. It cannot set a webhook source or sender actor. See the [QA contract](qa.md) and [operator workflow](../operations/qa-incidents-reports.md).

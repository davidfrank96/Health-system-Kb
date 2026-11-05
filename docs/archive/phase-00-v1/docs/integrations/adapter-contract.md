# Provider adapter contract

Design only. All adapters expose validateConnection, describeCapabilities, discoverApprovedAssets, collect and normalize operations. “Discover” is bounded to reviewed account/resource scope and does not automatically enable a discovered resource. Enabling APIs, agents, export jobs, permissions or alert policies is outside this interface.

Input: integration ID, environment, approved asset IDs, capability IDs, UTC observation range, bounded page size, abort/deadline signal and secret handle resolved only in the worker. Output: normalized observations, capability status, next cursor, source lag and safe error codes. Observation fields: asset/environment, provider, metric/version, unit, aggregation, interval start/end, observed/collected/ingested times, numeric value or null, allowlisted dimensions, quality, source event ID or canonical deduplication hash.

Capabilities have states supported/unavailable/permission_denied/unverified and include metric kind (gauge/counter/delta), allowed aggregations, dimensions/cardinality budget, sampling frequency, known delay, quota and cost model. Unsupported and empty responses remain distinguishable. Errors use auth_expired, forbidden, throttled, timeout, unsupported, malformed, partial and provider_unavailable; log request IDs and safe codes, never tokens or response bodies.

Use fixed provider hosts and versioned endpoints, allowlisted operations, parameterized resource IDs, TLS certificate validation and limited redirects (normally none). Contract tests assert emitted requests stay within approved read operations. Read-only query POSTs need explicit operation review; HTTP verb alone is not a permission guarantee. Use [data-flow](../architecture/data-flow.md) retry, lease and fencing rules.

Required fixtures: successful full/partial response, omitted metric, no observations, unit/aggregation mismatch, duplicate/late sample, API version drift, paginated truncation, 401/403/429/5xx, timeout, malformed/unbounded labels and clock skew. Fixtures contain no production identifiers or personal data. Live validation is a separate approved test with recorded scopes and cost limit.

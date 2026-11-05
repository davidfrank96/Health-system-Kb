# Azure integration design

Status: documented capability; Kbean resources, Cosmos API type and scopes unverified. Prefer Azure Monitor resource-scoped REST metrics and metric definitions, authenticated with `@azure/identity`. The official [`@azure/monitor-query-metrics` client](https://learn.microsoft.com/en-us/javascript/api/overview/azure/monitor-query-metrics-readme?view=azure-node-latest) is a candidate for batching, but documents subscription-level authorization; do not broaden access merely to use it.

## Permission and collection proposal

A dedicated identity per environment receives a reviewed custom read role for metric definitions/metrics on approved resource IDs, or narrowly scoped Monitoring Reader if its broader read capabilities are accepted. No Cosmos keys, data-plane database read/write, Contributor, diagnostic setting edits or alert-policy writes. [Azure monitoring roles](https://learn.microsoft.com/en-us/azure/azure-monitor/roles-permissions-security) describe the distinction. Temporary federation is preferred only if an actual trusted issuer usable from DO is demonstrated; otherwise approve a rotated client credential in worker-only secrets.

[Cosmos metric reference](https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-reference) supports `NormalizedRUConsumption`, `TotalRequests`, `ServiceAvailability` and latency metrics for relevant API types, with different aggregation/dimension support. Discover definitions first. Use maximum normalized RU for pressure, sum requests by allowed StatusCode dimensions for 429/error ratios, and provider-defined latency aggregations. Never turn max RU or a 429 alone into downtime; do not average percentile latency across series.

Collect five-minute windows with overlap and bounded pages. Proposal: 5m expected lag, 15m stale threshold until measured. Rate limits and batch constraints are endpoint/region dependent; record response quotas and cap requests by approved assets × metrics × intervals. Provider charges, export/egress and any log queries require pricing validation with the owner; no Log Analytics ingestion or diagnostic enablement is included.

On 403 mark denied capability, preserve last reading with age, and stop permission retries. On 429 obey Retry-After; on partial results retain per-metric gaps. Tests cover dimension expansion, counts versus rates, zero traffic/null ratios, expired identity, delayed windows and API-type differences. Before activation obtain resource IDs, API kind, supported metric descriptors, permission evidence, owner thresholds and alert authority.

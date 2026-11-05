# Integration feasibility matrix

Documentation research completed 31 October 2026; account-level feasibility remains unverified. “Supported interface” does not imply a Kbean resource is accessible or instrumented.

| Source | Proposed interface/client | Permissions | Initial collection | Feasibility and limitation |
| --- | --- | --- | --- | --- |
| Azure Cosmos/API | Azure Monitor resource metrics REST; `@azure/identity`; batch SDK optional | Resource-scoped metrics read; review Monitoring Reader breadth | 5m | Documented; metric/API type and dimensions need discovery; batch SDK subscription scope may be too broad |
| DO Droplet/App | Monitoring REST via typed HTTP | `monitoring:read` plus required read dependencies; app/database reads only if needed | 5m | Documented; host agent prerequisite, no installation authorized |
| GCP CDN/storage | Cloud Monitoring; `@google-cloud/monitoring` | `roles/monitoring.viewer` on approved projects or narrower custom role | 5–15m | Documented; resource descriptors, latency and quotas vary |
| Firebase operational | Underlying GCP service metrics | Purpose-specific Monitoring reader; no Admin SDK | 15–60m | Conditional; Authentication/App Check metric coverage not promised |
| Crashlytics | Existing BigQuery export; `@google-cloud/bigquery` candidate | Dataset/view reader + approved query-job permission/budget | Daily initially | Conditional; export/billing/privacy review and explicit exception for query-job execution |
| Kuma | Authenticated `/metrics` → private Prometheus HTTP API | Metrics-only key; private read proxy | 60s probes / 30s scrape | Current gauges documented; source heartbeat/precise historical completeness unverified |
| QA | Signed v1 webhook; read-only API fallback | Per-environment sender secret or scoped API token | Completion / 15m fallback | Contract not supplied; owner agreement required |
| Wazuh/Eramba | Authorized links first | None for storing approved references | Owner-defined | Supported endpoints and access not yet established |
| Hashio/Fusion | Unknown | Unknown | Unset | Blocked on product identity |

See provider-specific documents and [research](../architecture/research.md) for direct sources. API quotas, provider egress, BigQuery charges and existing alert ownership must be recorded per integration before enablement. No live credentials or permission tests were used.

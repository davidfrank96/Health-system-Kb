# Lean research evidence

Public primary documentation rechecked 31 October 2026. No account inventory, billing, credentials or targets queried. Published interfaces/price facts do not prove this account is configured, eligible or within free allowances.

| ID | Evidence | Consequence / remaining check |
| --- | --- | --- |
| LR01 | [App pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/): selected 1 GiB $12/month, 2 GiB $25; services/jobs prorated with billing-minimum details | $12 candidate; job minimum/proration/startup/retries must be confirmed before spend; no automatic resize |
| LR02 | [PostgreSQL prices](https://docs.digitalocean.com/products/databases/postgresql/details/pricing/): single-node starts at $15/month, 1 GiB | Chosen small plan; no standby/HA assumed |
| LR03 | [Scheduled jobs](https://docs.digitalocean.com/products/app-platform/how-to/manage-jobs/): minimum 15m, non-routable, billed only while running | Finite job instead of persistent collector; account behavior still untested |
| LR04 | [DO Monitoring](https://docs.digitalocean.com/products/monitoring/): free opt-in service, host agent supplies enhanced metrics | First infrastructure candidate; no agent install or universal metric claim |
| LR05 | [Monitoring API](https://docs.digitalocean.com/products/monitoring/reference/api/), [scope dependencies](https://docs.digitalocean.com/reference/api/scopes/monitoring/read/) | Only supported routes and reviewed effective read access; no write policy APIs |
| LR06 | [Azure cost/usage](https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/cost-usage): standard metric collection differs from charged REST retrieval | Automatic Azure disabled absent demonstrated zero incremental cost; manual fallback |
| LR07 | [Azure REST](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/rest-api-walkthrough): resource versus subscription-level multi-resource permission scope | Do not broaden grants for SDK convenience or perform billable discovery |
| LR08 | [Google Observability pricing](https://cloud.google.com/products/observability/pricing): first 1m time series per billing account free, excess charged; eligible calls count at least one | Shared-account usage/headroom and worst-case response cardinality must be bounded; no free-per-app assumption |
| LR09 | [Cloud Monitoring IAM](https://docs.cloud.google.com/monitoring/access-control) | Review Monitoring Viewer scope including linked projects; read role alone is not a cost approval |
| LR10 | [Managed restore](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/): daily backups, 7d retention, restore to new cluster and point-in-time selection | Budgeted temporary actual restore proof needed; no HA/RPO guarantee from documentation alone |
| LR11 | [App VPC](https://docs.digitalocean.com/products/app-platform/how-to/enable-vpc/) | Verify web/job private DB path; dedicated egress incompatibility means no assumed free fixed IP |

## Open technical checks

Scheduled job size eligibility, exact per-invocation minimum, runtime/startup billing, stop/timeout and retry/delay semantics are not established account facts. General short-lived app creation minimum must not be asserted as either definitely applicable or definitely inapplicable to each scheduled run. The cost model includes a sensitivity case and makes this an approval gate.

No current EUR/USD rate or tax jurisdiction is claimed: cost examples are explicitly hypothetical stress assumptions. Actual invoice currency, tax/fees, shared bandwidth, CI/build allowance, domain ownership and temporary restore costs require owner evidence.

No new dependency selection/installation in this revision. Maintained OIDC/SQL/client tooling and supported Node/pnpm/Next versions will be checked during authorized implementation. Existing Firebase telemetry and QA interface availability/cost, Hashio/Fusion identity, provider IAM, safe target response rules and actual resource counts remain unverified. The older research is preserved in the v1 archive; its superseded architectural inferences do not govern MVP.

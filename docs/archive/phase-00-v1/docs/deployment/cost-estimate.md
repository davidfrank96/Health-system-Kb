# Monthly cost estimate

Planning estimate in USD before tax, 31 October 2026; no purchase or resource creation authorized. Assumes modest staff traffic, <=100 monitored assets, <=2,000 low-cardinality metric series, 30-day detailed retention. No actual resource counts or load measurements exist.

| Item | Staging allowance | Production allowance | Basis |
| --- | ---: | ---: | --- |
| App Platform web | 1 × $12 = $12 | 2 × $12 = $24 | 1 GiB manually scalable containers |
| Persistent worker | 1 × $12 = $12 | 1 × $12 = $12 | Same initial size; benchmark before approval |
| Managed PostgreSQL | $15 | $260 | Staging single node; proposed new Advanced primary + standby at $130 each |
| Monitoring Droplet | $24 | $24 | Basic 4 GiB/2 vCPU published price; storage capacity must be tested |
| Second-region independent check | $0 | $6 allowance | Small isolated checker; exact selected plan pending |
| Spaces archive allocation | $5 | $5 | Conservative separate environment budget; account billing may combine base allowance |
| Additional backup/storage/transfer reserve | $10 | $25 | Planning allowance, not quoted SKU |
| **Subtotal** | **$78** | **$356** | **Combined $434/month** |
| **20% contingency** | **$15.60** | **$71.20** | **Combined envelope $520.80/month** |

These small web/worker sizes are starting assumptions, not capacity guarantees. Sources: [App Platform prices](https://docs.digitalocean.com/products/app-platform/details/pricing/), [Droplet prices](https://www.digitalocean.com/pricing/droplets), [Spaces prices](https://www.digitalocean.com/pricing/spaces-object-storage), [PostgreSQL prices](https://docs.digitalocean.com/products/databases/postgresql/details/pricing/).

The PostgreSQL page still describes legacy $30 primary + $30 standby plans, but also announces that new Standard clusters cannot add standby/read-only nodes from 15 October 2026 for new accounts and 30 November for all accounts. Advanced starts at $130/node. Given the December staging and March production schedule, do not budget new production HA at $60 without account-specific confirmation. Existing eligible clusters could differ. A cheaper single-node $30 production database scenario would reduce the combined base estimate to $204/month ($244.80 with contingency), but lacks a standby and requires explicit acceptance of weaker resilience; this is an alternative, not the recommended HA budget.

Excluded/unknown: Azure/GCP read/export charges, BigQuery scan/storage/streaming, new instrumentation, paid notification/identity products, extra GitHub Actions usage, domains, support, engineering labor, unusual egress, additional public replica hosting and fixed-egress gateway. Before spend approval, replace allowances with regional SKUs, storage growth measurements and provider query budgets. Alert at 70/90/100% of the approved ceiling; reduce optional collection only through a visible approved policy, never silently discard telemetry.

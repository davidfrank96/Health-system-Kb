# Infrastructure Health

Select the environment and provider in Infrastructure Health. A resource is a specific service mapping. Staff assertions use the service/provider scope specified in the CSV contract. A service can have several resources. The importer never guesses which resource an operator meant. Automatic readings carry an exact resource ID.

## Run locally

Use Node 22, the pinned pnpm version and native PostgreSQL 18 as described in [local setup](../database/local-development.md). From the repository root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test:unit
corepack pnpm test:e2e
corepack pnpm test:db
corepack pnpm job:fixtures
corepack pnpm local
```

The test and fixture commands create disposable databases. The local launcher migrates the persistent development database and starts the local app. Sign in with the local operator fixture for import controls. Create a service under Settings as an administrator. Copy its ID from the services API or select it in the entry form.

To register a resource against an existing service, run `node database/register-resource.mjs /path/to/reviewed-resource.json` with the approved local migrator environment. Use name, serviceId, environment, provider, resourceType, identifier and capabilities. Region, component and instance are optional. For example, use a synthetic droplet identifier and the capability load_1 in a disposable exercise. See the [metric dictionary](../../infrastructure/metrics.ts) for names. Registration creates a disabled resource and an audit event in one transaction. The web role cannot change its identity, scope, capabilities or cost evidence.

A local maintenance invocation of the existing job, `node jobs/check.mjs --maintenance`, uses the local collector database environment to retire up to 2,000 old observations and 2,000 expired summaries per execution. The launcher does not install a scheduler. Repeated invocations drain a backlog. Keep a database backup before schema changes. To roll back collection, disable the integration and keep its stored evidence.

## Enter and review evidence

Manual entry requires a checked confirmation, observation time in UTC, source reference and note. For CSV, paste the required header and rows or select a UTF-8 file, preview the normalized data, then confirm. Correct a staff assertion with its reading ID, original identity and timestamp, new value and correction reason. Keep credentials and private URLs out of free text. A conflict indicates that the identity is already occupied or another correction won the race.

Choose a latest reading to chart the last 24 hours, 7 days, 30 days or 90 days. Archived series remain selectable after raw observations expire. Daily points show the arithmetic mean of observed samples. They do not estimate the unobserved part of the day. The API also returns sample count, minimum and maximum. UTC day buckets preserve resource, source and metric identity. The chart uses dots and shows coverage and freshness. No arbitrary utilization threshold changes an availability state.

## Metric dictionary

All readings are finite and nonnegative. Percent is bounded at 100. Count is integral. Staff assertions become stale after 24 hours and provider samples after 45 minutes. UTC observation time determines freshness. Counts, rates and percent are displayed in their stored unit. Staff assertions have no free-form dimensions.

| Canonical name | DigitalOcean source or manual meaning | Type | Unit / aggregation | Scope |
| --- | --- | --- | --- | --- |
| cpu_utilization | droplet/cpu, active share of total mode-counter deltas | derived | percent / mean | Exact host and aligned CPU modes |
| memory_available | droplet/memory_available | gauge | bytes / mean | Exact host |
| filesystem_free | droplet/filesystem_free | gauge | bytes / mean | Root mount, one series |
| load_1 | droplet/load_1 | gauge | load / mean | Exact host |
| public_outbound_bandwidth | droplet/bandwidth, public outbound rate | derived rate | Mbps / rate | Exact interface and direction |
| app_cpu, app_memory | apps/cpu_percentage, apps/memory_percentage | gauge | percent / mean | Exact app, component and instance |
| app_restarts | apps/restart_count | counter reading | count / count | Exact app, component and instance |
| memory_utilization, disk_utilization, database_utilization | Staff-observed utilization | gauge | percent / mean | Manual |
| normalized_ru | Azure Cosmos DB normalized RU | gauge | percent / max | Manual Azure |
| latency, observed_availability | Reviewed latency (ms) or availability (percent) snapshot | gauge | ms or percent / mean | Manual, independent of Phase 02 |
| requests, failed_requests, throttled_requests | Staff-observed interval count | count | count / sum | Manual |

Droplet CPU requires all eight documented modes and two aligned observations. Resets and incomplete intervals do not produce percentages. Bandwidth is already a rate in the selected API. An empty matrix has no numeric value. Only the root filesystem and one exact App instance per resource mapping are selected. Multiple series for an ambiguous selection fail closed. Load balancer, managed PostgreSQL and other resource types can appear in inventory, with manual service-level observations where appropriate.

## Live approval gate

The executable has no live-provider mode. Controlled matrices can flow through the real parser, collector DB identity, application API and browser. Before a separately authorized live release, record the provider, exact identifiers, metric allowlist, owner, effective read scopes, reviewed pricing and expiry, zero incremental account cost, bounded expected series, approved daily allowance and environment-specific job credential. A bounded live test needs independent approval. No cost assertion applies across accounts. Review app:read only where the exact approved operation requires it.

Each attempt reserves its allowance before transport. Reservations survive unsuccessful responses. The SQL envelope caps all resources together at 96 requests and 1,536 reserved series per UTC day, with tighter per-resource caps and a one-second minimum interval. One attempt uses a fixed HTTPS GET, disallows redirects, reads at most 64 KiB, caps series at 16 and points per series at 120, and times out within five seconds or the earlier job deadline. There is no pagination or retry loop. Permission and rate-limit errors block subsequent resource requests until offline review. Provider errors are collection evidence only. The browser receives safe classifications and readings.

Review references: [Monitoring REST](https://docs.digitalocean.com/products/monitoring/reference/api/), [Monitoring pricing](https://docs.digitalocean.com/products/monitoring/details/pricing/) and [effective read scopes](https://docs.digitalocean.com/reference/api/scopes/monitoring/read/).

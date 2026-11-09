# DigitalOcean first integration

DigitalOcean describes [Monitoring as a free opt-in service](https://docs.digitalocean.com/products/monitoring/). [Documented REST metrics](https://docs.digitalocean.com/products/monitoring/reference/api/) are the first infrastructure candidate. This does not authorize installing agents or guarantee every resource/engine has every metric. No additional Monitoring subscription is planned; verify API/egress and actual resource support before activation.

Use typed validated HTTP requests from the scheduled job, initially every 15 minutes. Collect only selected CPU, available/total memory, filesystem, load/network or App CPU/memory/restart metrics exposed for approved resources. Convert cumulative CPU/network counters using valid interval deltas and reset handling; do not interpret totals as instantaneous utilization. PostgreSQL resource/health metric availability must be separately verified; MySQL routes are not substitutes. Missing host agents mean unsupported coverage; never install one during discovery.

Token scope starts with `monitoring:read` and documented required read dependencies (`droplet:read`, `regions:read`, `sizes:read`, `actions:read`, `image:read`, `snapshot:read`), adding app/database reads only for approved capabilities. [Scope reference](https://docs.digitalocean.com/reference/api/scopes/monitoring/read/). Team visibility may exceed the app allowlist; record effective scope and security acceptance. Store job-only secret references, never values in DB or browser.

Initial request budget must be derived from the small verified inventory (test envelope 20 services/<=100 metric series); page/series limits and retry budget are explicit. No cloud write routes or new monitoring infrastructure. Before enablement: owner verifies resources/agent state, effective scopes, no incremental request/transfer cost and existing alert ownership. Tests cover absent instrumentation, API denial/throttle, unsupported engine, late/stale data, counter reset and expired cost evidence. Manual snapshots remain available.

## Phase 03 implementation

See the [implemented dictionary, assumptions and request limits](../operations/infrastructure-health.md). The finite job accepts fixtures or local retention. Real-provider validation is pending an approved exact target, environment credential and bounded live test.

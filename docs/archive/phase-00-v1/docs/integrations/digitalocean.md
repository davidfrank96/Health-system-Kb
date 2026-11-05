# DigitalOcean integration design

Status: documented REST interface; Kbean resources and instrumentation unverified. Use typed HTTP over documented endpoints, with schema validation rather than an unverified third-party Node SDK.

The [Monitoring API](https://docs.digitalocean.com/products/monitoring/reference/api/) offers Droplet CPU/memory/filesystem/load/bandwidth and App CPU/memory/restart metrics. Database metrics must be verified per engine; the existence of a MySQL monitoring route does not prove a PostgreSQL equivalent.

Use `monitoring:read`. Its documented required scopes are `droplet:read`, `regions:read`, `sizes:read`, `actions:read`, `image:read`, and `snapshot:read`; [scope reference](https://docs.digitalocean.com/reference/api/scopes/monitoring/read/). `app:read` and `database:read` are optional only when required by approved assets. A token's team visibility can exceed the app's asset allowlist; review that residual access with the security owner and use a suitable isolated team if available. Do not request write or secret-returning endpoints.

The [metrics agent](https://docs.digitalocean.com/products/monitoring/getting-started/quickstart/) supplies enhanced host metrics. Missing instrumentation is “unavailable”; installing an agent requires a separate infrastructure change. Calculate CPU from counter deltas with reset handling, memory using available/total semantics and filesystem usage per approved mount; omit pseudo-filesystems. Query 5m intervals, record source lag, and bound cardinality/pagination. Budget quota using provider response headers, retry 429 with jitter and isolate failed resources.

Monitoring is described as free/opt-in, but hosting, backup, storage and outbound transfer costs remain separate. Record account rate limits and actual capability responses before enablement. Tests: agent absent, team-wide discovery filtered to approved IDs, missing mounts, counter reset, paginated resources, token revocation and unsupported DB metric family. Never create or alter alert policies through this adapter.

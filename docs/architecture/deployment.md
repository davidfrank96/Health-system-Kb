# Lean DigitalOcean deployment design

Proposed components only: one 1 GiB App Platform web service, one 1 GiB single-node Managed PostgreSQL cluster and one finite scheduled job initially budgeted at 1 GiB every 15 minutes. No resources, region, domains, credentials or DBs are created. Plan availability and job SKU must be checked in the actual account before approval.

The web service serves authenticated UI/API and synchronous reports/QA imports. The scheduled job is non-routable, billed during execution and exits after bounded work. App Platform's [job documentation](https://docs.digitalocean.com/products/app-platform/how-to/manage-jobs/) confirms a 15-minute minimum. No web-request-triggered arbitrary collector endpoint is exposed. Shared modules do not imply shared secret access: provider read credentials go only to the job, OIDC and QA verification secrets only to the web. Migration/deployment credentials stay outside normal runtime.

Use a supported same-region private database connection with TLS verification and trusted sources. [VPC constraints](https://docs.digitalocean.com/products/app-platform/how-to/enable-vpc/) and mapping must be checked for both web and job; dedicated egress IPs are not included and are incompatible with that VPC feature. If a provider requires paid static egress, leave its integration disabled rather than adding an unbudgeted gateway. Direct public HTTPS checks reject internal targets at the executor even if the job can reach its private database.

| Flow | Authorization / network design |
| --- | --- |
| Staff → web over HTTPS | OIDC allowlist, MFA policy and server session; private content no-store |
| QA → web over HTTPS | Existing no-charge sender, HMAC/replay and per-service/env mapping |
| Web/job → DB | TLS, narrow separate DB principals, trusted sources; bounded pools |
| Job → target | Approved HTTPS/443, no redirects, validated pinned public DNS, response/time caps |
| Job → provider | Fixed documented hosts, reviewed read permission and current zero-cost approval |

The app is authenticated, not necessarily reachable only on a private network. All data/status/report endpoints require staff sessions; only login/callback and minimal platform health endpoints, plus separately authenticated QA webhook, bypass staff-session middleware. Never publish report/object URLs.

## Development and temporary staging

Native PostgreSQL 18 and mocked providers are the development/test environment. Postgres.app is preferred on macOS. The CI service uses the same major version. Current connection validation accepts only Unix sockets and literal loopback. Use the [local database guide](../database/local-development.md) for native setup and test reset. Distinguish deployment environment (local/test/production) from monitored service environment (production/staging/development). Local fixtures cannot reach production targets/credentials. Temporary DO staging requires an explicit reason, separate DB/credentials, safe targets, itemized cost, owner and automatic/manual teardown deadline; it does not run continuously and cannot become a silent baseline expense.

## Backups, release and recovery

Managed PostgreSQL [daily backups and seven-day recovery window](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/) are the starting recovery mechanism. Document actual PITR eligibility and observed recoverable point before release. Restoring creates a new cluster and costs money: a temporary restore verification must be explicitly approved/budgeted, with collectors disabled and test credentials before connection. Local SQL restore checks complement, not replace, the provider restore rehearsal.

Proposed modest objectives: durable data RPO <=24h and RTO <=1 business day, subject to owner acceptance and measured restore evidence. These replace the previous 1h/4h objectives; no stronger guarantee is claimed. Backups are not HA. No extra archive service or secondary region is assumed; longer retention/independent backup is deferred pending need/cost approval. Configuration is recoverable from reviewed source plus the owner's protected secret records.

Release builds should be tested locally and promoted as a fixed revision/artifact; untrusted PRs receive no secrets, actions/dependencies are pinned and scanned. After explicit resource/deploy authorization, verify TLS, auth, DB grants, job schedule/termination/usage and rollback on the small DO plan. First rollout is reversible: stop new collector work, revert compatible app version, preserve data and use forward migration repair. No automatic destructive down migration, scaling or paid upgrade.

The single web/DB and scheduler share provider failure risk. The dashboard can show stale run evidence only when reachable; independent failure alerting is not promised. Use existing provider account tools and owner checks for v1; record acceptance before production.

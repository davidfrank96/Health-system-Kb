# DigitalOcean deployment design

Design only. No region, resource IDs, domains, VPCs, credentials or cloud accounts are verified. Select a supported primary region after data residency and latency review; do not infer residency from the operator's timezone.

## Environment topology

Production: two modest App Platform web instances proposed for web-process redundancy, one persistent worker initially (lease design permits replacement/replication), Managed PostgreSQL primary/standby if budget approved, and one 4 GiB monitoring Droplet with pinned Kuma/Prometheus/Grafana containers and persistent volumes. The single worker and monitoring Droplet remain availability risks; a second-region independent probe helps detect failure but does not create full HA. Optional Spaces uses private encrypted environment-separated buckets/prefixes and distinct keys.

Staging: separate App Platform app, worker, database cluster/credentials and monitoring Droplet; approved mock/test targets and sink notifications only. No production worker secrets are available to staging builds/runtime. Local development uses isolated fixtures in future Docker configuration. Secrets are runtime-scoped; no secrets enter image layers or public build-time variables.

[App Platform scheduled jobs](https://docs.digitalocean.com/products/app-platform/how-to/manage-jobs/) have a 15-minute minimum, so use a persistent worker for five-minute work. App filesystems are not the durable database or monitoring storage. [VPC integration](https://docs.digitalocean.com/products/app-platform/how-to/enable-vpc/) supports private resources but is incompatible with dedicated egress IPs and excludes Functions. Match the App Platform datacenter mapping to the selected VPC. If a provider requires fixed source IPs, review a separately priced egress gateway/worker placement alternative before deployment; do not assume both features can be enabled together.

## Network flow allowlist

| Caller | Destination | Transport | Constraint |
| --- | --- | --- | --- |
| Public/staff browsers | Web ingress | HTTPS 443 | Public projection or authenticated server session |
| QA source | Webhook ingress | HTTPS 443 | HMAC, timestamp, replay, size/rate limits |
| Web/worker | Environment database | Verified PostgreSQL TLS port | VPC/trusted sources, separate DB roles |
| Worker | Provider APIs | HTTPS 443 | Fixed API hosts, approved resource scope |
| Worker/Grafana | Prometheus read proxy | Private TLS endpoint | Authenticated, bounded query interface |
| Prometheus | Kuma metrics/exporters | Private authenticated endpoint | Metrics-only credentials, no public labels |
| Kuma | Approved targets | Approved HTTP(S)/TCP/DNS | Approved ports, resolver and egress restrictions |
| Engineers | Monitoring administration | Approved VPN/access path | MFA/authentication and audited access |
| Archive worker | Spaces | HTTPS 443 | Scoped object operations/private buckets |

Never expose 3000/3001/9090 indiscriminately. Bind listeners to private/container interfaces; enforce firewall and application authentication. The actual access path and port numbers need deployment validation. Network URL validation must be enforced at probe execution, not just monitor creation; restrict metadata/link-local/loopback/private destinations unless narrowly reviewed internal targets require a separate executor. Metadata/credential services stay forbidden.

## Release and recovery

Future GitHub Actions builds run without production secrets on untrusted PRs. Pin third-party actions, produce immutable artifact digests, scan dependencies/secrets, and promote the tested artifact through separately approved staging and production environments. Migration identity is separate from runtime. Use expand/contract migrations; failed startup readiness prevents traffic. Roll back compatible application artifacts first; destructive schema reversal is never automatic.

[Managed PostgreSQL backups](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/) are daily and retained seven days; restore creates a new primary. Additional encrypted logical archives are proposed for longer retention, not assumed configured. Proposed objectives: internal durable records RPO <=1h and RTO <=4h; monitoring configuration/raw metrics RPO <=24h and RTO <=8h. Provider recovery capability, archive frequency/cost and timed restore rehearsal must demonstrate these targets; daily backups alone do not prove the 1h objective. Retain restore capacity and access independently of compromised app credentials.

Use a second DO region to monitor public web, worker heartbeat and monitoring-stack health. It must have its own scheduler and notification route, not rely on the primary DB. Same-provider outage remains a shared failure. An independently served public snapshot is a later proposal requiring separate deployment approval; initially the public page shares the main application's outage risk.

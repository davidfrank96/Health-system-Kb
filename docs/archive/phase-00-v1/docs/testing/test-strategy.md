# Verification strategy and proposed acceptance thresholds

Phase 00 checks documents/contracts only. No build, unit, integration, E2E, performance or security runtime test can pass before implementation exists. Tests must verify observable behavior and failure modes, not mirror source code.

## Test layers

| Layer | Tool / target | Required evidence |
| --- | --- | --- |
| Unit | Vitest, pure domain logic | Units/aggregation, stale/missing, overlap and maintenance arithmetic, zero denominators, alert hold/recovery, RBAC validation |
| Integration | Real isolated PostgreSQL + mocked HTTP | Migrations, constraints/env FKs, concurrent lease reclaim/fencing, duplicate ingest, rollback, outbox crashes, auth expiry, 429/timeout/partial responses |
| Contracts | OpenAPI validator and adapter fixtures | Request/response conformance, bounded fields, provider version drift, no credential/public-field leaks, QA signatures |
| E2E | Playwright against local/authorized staging | OIDC allowlist + all role denials, navigation, env separation, details, incidents/publication/retraction, reports, public history, empty/error/stale states |
| Performance | k6 on authorized staging | Reproducible scenario/seed, measured latency/errors/throughput/resource use, slow-provider isolation |
| Security | Secret/dependency scan; ZAP on authorized staging | Authorization matrix, session/CSRF/CSP, replay/signature, SSRF executor/DNS/redirect, safe exports, untrusted CI, secret redaction |
| Operations | Timed staging rehearsal | Restore/reconnect, rollbacks, restart job recovery, archive access, independent failure alert |

## Initial workload and numerical gates

Assumed test inventory: 100 assets, 20 metric series each, <=100 probes, 50 concurrent staff, 100 concurrent public readers. Synthetic fixtures are isolated and visibly marked; never seed production health. Dataset: 30 days of 5m snapshots (17.28m potential rows) plus 12 months of daily rollups. Adjust to verified inventory at Phase 00 approval; costs and sizing depend on this envelope.

- Private overview/latest API p95 <=750ms, p99 <=2s at 50 concurrent users; public cached reads p95 <=300ms at 100 concurrent users in a documented test region. 95% of 90-day bounded history requests <=1.5s. Request error rate <1% excluding deliberately injected denial/failure cases. Run a 30-minute steady load plus 5-minute 2× spike; record cold/warm results separately.
- 99% of due jobs start within 60s under steady load. Five-minute source collection completes within 120s of due time for a healthy provider; measured provider lag remains separately visible. Backlog from a 10m worker outage drains within 15m after recovery without duplicate durable samples or alert events.
- QA durable acknowledgement p95 <=1s; accepted events visible within 60s; exact duplicate event creates no additional run/delivery. 256 KiB boundary and 60 events/min sender limit verified.
- >=99% eligible probe coverage before unqualified uptime display; fixtures with zero/partial coverage must return null/qualification. 90-day buckets must reconcile raw durations within one sampling interval at boundaries.
- Proposed Health System monthly availability objective 99.5%, measured independently (not a measured current result or external SLA). Critical probe failures become internal confirmed alerts within 5m only when executor freshness and confirmation conditions are satisfied. Notification successful delivery p95 <=2m after confirmed transition when channel healthy.
- 360px, 768px and 1440px layouts: no horizontal overflow/overlap, keyboard access and visible focus; WCAG 2.2 AA goal with automated critical violations zero plus manual keyboard/screen-reader review.
- Security: all denied-role/env/public-field tests pass; no unresolved critical/high findings at release unless explicitly accepted by accountable owner with expiry/mitigation. Secrets scanning returns no real secrets. Dependency findings triaged by reachability and fix availability.
- Proposed durable-record RPO <=1h/RTO <=4h; monitoring RPO <=24h/RTO <=8h. A timed restore must establish achieved values. No failed restore can be replaced by a successful backup claim.

## Phase gates and artifacts

Phase 01 verifies auth/env/db/jobs and staging smoke; 02 verifies adapters and freshness; 03 verifies public privacy/history/publication; 04 verifies QA/reports/delivery; 05 runs full regression/performance/security/recovery. Each report records revision/artifact digest, command, tool version, environment/approved target, fixture/workload, start/end, pass/fail, artifact link, unresolved defects and retest scope. No production resource is an uncontrolled test target. Failed tests and excluded areas remain visible in the build log.

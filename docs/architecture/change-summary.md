# Architecture revision and deferred scope

The owner's lean brief supersedes conflicting v1 assumptions. It selects architecture direction only; Phase 01, spending, resources and deployment remain unapproved. Earlier $434/month was a hosting/database estimate, not an API bill.

| Area | Previous proposed v1 | Current lean MVP |
| --- | --- | --- |
| Audience | Public status plus private dashboard | Staff-only dashboard/status; seven sections |
| Runtime | Web replicas, persistent worker, monitoring host | One web instance and finite 15m scheduled job |
| Database | Advanced primary+standby, separate always-on staging | Small single-node managed PostgreSQL; local dev/test |
| Probe engine | Kuma/Prometheus sampling and private Grafana | Direct approved HTTPS requests with bounded safe executor |
| Infrastructure data | Azure/DO early automated adapters, conditional BigQuery | DO first; every source permission/cost-gated; unknown costs disabled; manual snapshots/CSV |
| Pipeline | Queue leases, series/rollups/outbox/public revisions | Small run ledger, duplicate keys/advisory lock, raw readings/daily summaries |
| QA | Durable asynchronous inbox/consumer | Small synchronous validated existing webhook/API/manual import |
| Reports | Report jobs/artifacts/optional archives | Existing web app queries PostgreSQL; private UI and CSV |
| Test scale | 100 assets/2,000 series, public load | Proposed 20 endpoints/100 series, 5 concurrent staff |
| Cost | $434 base / $520.80 contingency | $27 fixed base; $35 pre-tax/FX planning envelope, ~€50 target subject to account proof |
| Recovery | Proposed 1h RPO/4h RTO, extra archives/checker | Proposed <=24h RPO/1 business day RTO, managed recovery and budgeted restore test |
| Delivery order | Infrastructure then public status | Foundation → availability → infrastructure/manual → QA/incidents/reports → release verification |

Retained: OIDC/MFA/allowlist, server RBAC and environment boundaries, secrets/read-only IAM, SSRF defenses, signed QA if supported, incident/maintenance history, trustworthy freshness, backups, documented testing and phased approval. No requirement to reduce security to meet budget.

## Deferred and excluded

Deferred pending measured need and new scope/budget approval: public publishing/subscriptions/publisher roles; faster-than-15m monitoring; Kuma/Prometheus/Grafana or additional hosts; independent regions/checks; HA standby; continuous remote staging; Redis/Kafka/Kubernetes/Elasticsearch; distributed orchestration; separate reporting/archives; PDF; advanced dependency graphs/multi-service incident modeling; external alert delivery/escalation. None is an MVP prerequisite or hidden runtime package.

Excluded by current direction: runtime OpenAI/other AI inference, paid third-party monitoring/logging/tracing/analytics/identity/notification APIs, paid SMS, new billable provider features or BigQuery jobs/exports, automatic production remediation and duplicate QA/security engines. A future desire for these requires an explicit revised policy, not an adapter flag.

## History

[Original baseline](../requirements/master-architecture.md) remains with a precedence notice. The [previous packet](../archive/phase-00-v1/HISTORICAL.md) has a SHA-256 manifest covering the archived copies after publication redactions, including its schema/API/report/build log. ADRs 0001–0006 are marked superseded for MVP; [ADR 0007](../decisions/0007-lean-internal-mvp.md) records this decision. Empty obsolete runtime placeholders were removed after their original intended layout was preserved. Historical text is not current acceptance or deployment guidance.

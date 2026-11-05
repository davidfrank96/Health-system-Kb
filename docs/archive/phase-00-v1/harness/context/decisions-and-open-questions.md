# Approval and open question register

As of 31 October 2026 all proposed decisions below await review. Owners are required roles, not named people or recorded approvals. Approval records must include person, date, exact document/commit revision, approved actions, limitations and review expiry.

| ID | Decision / evidence needed | Required owner | Blocking point | Proposed resolution |
| --- | --- | --- | --- | --- |
| Q01 | Confirm scope, repository ownership/privacy and Apache licensing intent | Product/repository owner | Phase 00 acceptance | Retain existing repo/name/license unless instructed |
| Q02 | Verify initial asset inventory, environments, owner and impact dependencies | Asset owners | Phase 00 acceptance / integration enablement | Minimal dated inventory and approved targets, no broad credentials |
| Q03 | Confirm IdP organization, user allowlist, MFA enforcement and auth library constraints | Security/identity owner | Phase 01 auth | Google OIDC subject allowlist, server sessions, managed MFA |
| Q04 | Approve publication authority, public components, maintenance accounting and unknown status | Product/security | Phase 00 design / Phase 03 | Separate publisher grant, immutable approved revisions; 99% coverage requirement |
| Q05 | Approve region, data residency, VPC mapping and fixed-egress requirements | Infrastructure/security | Phase 01 staging | Separate environments; fixed egress conflict requires design review |
| Q06 | Choose PostgreSQL edition/HA and approve monthly ceiling | Infrastructure/budget owner | Provisioning | $434 base / $520.80 contingency envelope for staging+HA production; verify actual quote |
| Q07 | Approve retention, archival encryption/key ownership, RPO/RTO | Security/operations | Phase 00 design / release | 1h/4h durable records, 24h/8h monitoring; only guarantees after rehearsal |
| Q08 | Confirm provider IAM and actual supported metrics/quotas | Provider/security owners | Phase 02 | Read-only identities per environment; no write permission expansion |
| Q09 | Accept or reject BigQuery query-job exception and source-storage interpretation | Security/billing/Firebase owners | Crashlytics integration | Existing restricted aggregates + cost cap; otherwise defer |
| Q10 | Agree QA schema, signing, replay/revision rules, evidence access and suite schedule | QA owner | Phase 04 | Proposed v1 HMAC webhook, read-only polling fallback |
| Q11 | Prove Kuma underlying probe recency and sampling semantics; approve executor SSRF controls | Monitoring/security owners | Phase 03 history | Controlled spike; unknown when recency cannot be proven |
| Q12 | Select one authority per alert and notification destinations | Operations/provider owners | Phase 04 | No channel enabled before approved routing and noise policy |
| Q13 | Approve public notification/feed method and subscriber privacy if needed | Product/privacy | Phase 03 | Feed first proposal; email needs consent/unsubscribe design |
| Q14 | Identify Hashio/Fusion and Wazuh/Eramba supported scope | Integration owners | Respective adapter work | Defer unknown providers; authorized references first |
| Q15 | Approve workload/latency/freshness targets and resource assumptions | Engineering/product | Phase 00 acceptance | 100 assets/2,000 series test envelope, measured sizing later |
| Q16 | Accept same-provider, single monitoring host and initial public-app outage risks | Operations/product | Production release | Second-region independent checker; independent public snapshot considered later |
| Q17 | Approve Phase 01 implementation and exact staging/provisioning/push scope | Project/infrastructure owner | Any Phase 01 work | Separate architecture approval from spend/deploy/push authorization |

## Risk register

| Risk | Likelihood / impact (planning judgment) | Mitigation | Evidence/owner |
| --- | --- | --- | --- |
| Access/discovery delays jeopardize dates | High / high | Prioritize inventory and IAM review, explicitly defer unsupported adapters | Q02/Q08, project owner |
| Budget assumes obsolete low-cost HA plan | High / high | Use announced new-cluster pricing, obtain regional quote | Q06, budget owner |
| Scrape success hides stalled probes | Medium / high | Source-recency spike, unknown gaps, never fabricate exact uptime | Q11, monitoring owner |
| Cross-service credentials/data exposed | Medium / high | Effective IAM review, server boundaries, secret/public-field tests | Q03/Q04/Q08, security |
| Metric cardinality/quota costs exceed plan | Medium / medium | Descriptor allowlists, limits, storage benchmark, budget alerts | Q15, engineering |
| Single monitoring host or DO outage blinds system | Medium / high | Independent checker, rehearsed recovery, residual risk acceptance | Q16, operations |
| Notification duplicates or public disclosure | Medium / high | Authority registry, outbox/dedupe and explicit publication | Q04/Q12, operations |

No risk has been formally accepted. No request for secrets is needed to review these documents; owners can supply scoped evidence references and configuration decisions.

# Goals and acceptance

## Mission

Enable authorized Kbean operators to assess service availability, capacity, incidents, QA and security indicators without manually visiting every provider. Publish only approved customer-facing status.

## Outcomes and scope

- Public status with approved components, 90-day history, incident/maintenance timelines and an approved notification channel.
- Authenticated overview, applications, infrastructure, availability, incidents, QA/security references, reports, integrations and administration.
- Read-only Azure/DigitalOcean first; GCP/Firebase capabilities only when verified. QA webhook or polling imports existing test results.
- Explicit source time, collection time, freshness, coverage and environment on every operational view.
- HTML, CSV and JSON daily/weekly/monthly reporting; PDF deferred until the reporting contract is stable.

## Non-goals

No production remediation, cloud IAM/alert-policy changes, customer business data ingestion, QA execution engine, SIEM replacement, custom time-series engine, or generative incident analysis. No Redis/Kafka/Kubernetes without a new demonstrated requirement and ADR.

## Acceptance

Each phase meets [its plan](PLANS.md), has executable verification appropriate to delivered behavior, documents unresolved defects and receives approval before the next phase. Production requires verified inventory, permission review, isolated staging evidence, public-data isolation tests, recovery rehearsal and accepted residual risks. Health and performance targets in [test strategy](docs/testing/test-strategy.md) are proposed targets until approved and measured.

## Delivery

Planning target 20 November 2026; overall target 31 March 2027. Milestones are conditional on access, owners, agreed workload and review capacity. No implied SLA or deployment authorization follows from these dates.

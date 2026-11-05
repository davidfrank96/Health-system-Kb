# Kbean Health System

An internal dashboard for approved Kbean staff: sampled application availability, supported infrastructure readings, QA results, incidents and historical reports.

**Current design: lean MVP, Phase 00 revision. No implementation or deployment authorized.** One Next.js web service, one small single-node PostgreSQL database and one finite scheduled collection job every 15 minutes. Target approximately €50/month including small operational charges; the actual hard spending limit and account costs must be approved before deployment. No additional paid API services or runtime AI.

Start with the [revised Phase 00 report](docs/architecture/phase-00-report.md), [change summary](docs/architecture/change-summary.md), [cost estimate](docs/deployment/cost-estimate.md) and [approval register](harness/context/decisions-and-open-questions.md).

## Planning packet

- [Revised user requirements](docs/requirements/lean-architecture.md), [goals](GOALS.md), [roadmap](PLANS.md), [instructions](AGENTS.md), [prompts](PROMPTS.md)
- [Architecture](docs/architecture/overview.md), [data flow](docs/architecture/data-flow.md), [monitoring model](docs/architecture/monitoring-model.md), [deployment](docs/architecture/deployment.md), [repository layout](docs/architecture/repository-structure.md)
- [Inventory](docs/assets/inventory.md), [integration matrix](docs/integrations/feasibility-matrix.md), [manual import contract](docs/integrations/manual-imports.md), [research](docs/architecture/research.md)
- [Schema/ERD](docs/database/schema.md), [API rules](docs/api/README.md), [OpenAPI](docs/api/openapi.yaml), [security](docs/security/threat-model.md), [access control](docs/security/access-control.md)
- [Testing](docs/testing/test-strategy.md), [runbooks](docs/operations/runbooks.md), [backlog](harness/build/backlog.md), [Phase 01](harness/build/phase-01.md), [validation](docs/testing/phase-00-validation.md), [build log](harness/build-log.md)

No runnable application exists. Local development/testing is the default; temporary remote staging requires a specific approval and expiry. All service health, reports and status routes require authentication. Public status/subscriptions and extra monitoring infrastructure are deferred.

The [original baseline](docs/requirements/master-architecture.md) and [archived v1 packet](docs/archive/phase-00-v1/HISTORICAL.md) remain historical evidence. Their conflicting scope is superseded. Existing repository `davidfrank96/Health-system-Kb`, privacy confirmation and Apache 2.0 licensing intent remain owner checks; no rename or license change is made.

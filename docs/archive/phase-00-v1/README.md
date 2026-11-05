# Kbean Health System

Centralized operational visibility for Kbean and INSSA services, infrastructure, incidents, QA, and security indicators.

**Status: Phase 00 planning draft, ready for review; acceptance gate remains open.** There is no application to run yet. No cloud resources or integrations have been configured.

Start with the [Phase 00 report](docs/architecture/phase-00-report.md), [roadmap](PLANS.md), [requirements baseline](docs/requirements/master-architecture.md), and [approval register](harness/context/decisions-and-open-questions.md).

## Documentation

- [Mission and acceptance](GOALS.md), [Codex instructions](AGENTS.md), [reusable prompts](PROMPTS.md)
- [Architecture](docs/architecture/overview.md), [data flow](docs/architecture/data-flow.md), [monitoring semantics](docs/architecture/monitoring-model.md)
- [Deployment](docs/architecture/deployment.md), [cost estimate](docs/deployment/cost-estimate.md), [target repository](docs/architecture/repository-structure.md)
- [Asset inventory](docs/assets/inventory.md), [integration feasibility](docs/integrations/feasibility-matrix.md), [research evidence](docs/architecture/research.md)
- [Schema and ERD](docs/database/schema.md), [API design](docs/api/README.md), [OpenAPI](docs/api/openapi.yaml)
- [Threat model](docs/security/threat-model.md), [access control](docs/security/access-control.md), [test strategy](docs/testing/test-strategy.md)
- [Runbooks](docs/operations/runbooks.md), [backlog](harness/build/backlog.md), [Phase 01 plan](harness/build/phase-01.md), [work log](harness/build-log.md)

The existing repository is `davidfrank96/Health-system-Kb`; the blueprint's `kbean-health-system` name is proposed, not an instruction to rename it. Remote privacy and organization ownership need owner confirmation. The existing Apache 2.0 LICENSE is preserved; confirm that licensing is intentional for this private project.

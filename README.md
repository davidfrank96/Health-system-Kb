# Kbean Health System

An internal dashboard for approved Kbean staff: sampled application availability, supported infrastructure readings, QA results, incidents and historical reports.

**Phase 02 availability monitoring is implemented locally; acceptance review is pending.** One Next.js web service, one small single-node PostgreSQL database and one finite scheduled collection job every 15 minutes. Target approximately €50/month including small operational charges; the actual hard spending limit and account costs must be approved before deployment. No additional paid API services or runtime AI.

Start with the [revised Phase 00 report](docs/architecture/phase-00-report.md), [change summary](docs/architecture/change-summary.md), [cost estimate](docs/deployment/cost-estimate.md) and [approval register](harness/context/decisions-and-open-questions.md).

## Planning packet

- [Revised user requirements](docs/requirements/lean-architecture.md), [goals](GOALS.md), [roadmap](PLANS.md), [instructions](AGENTS.md), [prompts](PROMPTS.md)
- [Architecture](docs/architecture/overview.md), [data flow](docs/architecture/data-flow.md), [monitoring model](docs/architecture/monitoring-model.md), [deployment](docs/architecture/deployment.md), [repository layout](docs/architecture/repository-structure.md)
- [Inventory](docs/assets/inventory.md), [integration matrix](docs/integrations/feasibility-matrix.md), [manual import contract](docs/integrations/manual-imports.md), [research](docs/architecture/research.md)
- [Schema/ERD](docs/database/schema.md), [API rules](docs/api/README.md), [OpenAPI](docs/api/openapi.yaml), [security](docs/security/threat-model.md), [access control](docs/security/access-control.md)
- [Testing](docs/testing/test-strategy.md), [runbooks](docs/operations/runbooks.md), [backlog](harness/build/backlog.md), [Phase 01](harness/build/phase-01.md), [validation](docs/testing/phase-00-validation.md), [build log](harness/build-log.md)

Run the Next.js application and synthetic staff login with native PostgreSQL using the instructions below. Local development/testing is the default; temporary remote staging requires a specific approval and expiry. All service health, reports and status routes require authentication. Public status/subscriptions and extra monitoring infrastructure are deferred.

The [original baseline](docs/requirements/master-architecture.md) and [archived v1 packet](docs/archive/phase-00-v1/HISTORICAL.md) remain historical evidence. Their conflicting scope is superseded. Existing repository `davidfrank96/Health-system-Kb`, privacy confirmation and Apache 2.0 licensing intent remain owner checks; no rename or license change is made.

To run the quality checks from the repository root, follow the [local setup and commands](docs/testing/test-strategy.md#local-setup-and-checks). The [Phase 01 milestone report](docs/reports/phase-01-report.md) records the verified application, test results and remaining hosted checks.

## Run the local foundation

From the repository root, install Node 22.12+ (22.x), Corepack and native PostgreSQL 18. Postgres.app is preferred on macOS. Then run:

```sh
corepack pnpm install --frozen-lockfile
NEXT_TELEMETRY_DISABLED=1 corepack pnpm build
corepack pnpm local
```

Open the loopback URL printed by the launcher, continue to sign in and choose a synthetic local identity. Choose admin to add/edit services under Settings & Integrations. Ctrl-C stops the app, issuer and database while preserving the development inventory. The [database guide](docs/database/local-development.md) covers installation, migrations, environment variables, tests, reset and recovery. The [acceptance report](docs/reports/phase-01-report.md) records the results.

## Phase 02 availability

Overview and Application Status read actual stored monitoring observations; Settings manages disabled targets and approved configuration. The [monitoring guide](docs/operations/availability-monitoring.md) covers the controlled job, exact target approval, health/history semantics, limits, native testing and troubleshooting. Run `corepack pnpm job:fixtures` for a disposable HTTP-to-PostgreSQL scenario. Live checks and cloud integrations remain disabled. See the [Phase 02 report](docs/reports/phase-02-report.md) before approval or publication.

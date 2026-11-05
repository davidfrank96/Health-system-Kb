# Target repository structure

Phase 00 contains Markdown designs, the proposed OpenAPI contract and `.gitkeep` placeholders only. Existing LICENSE and .gitignore are preserved. The tree below describes the planned final layout; entries labeled later are not implemented.

```text
Health-system-Kb/
  README.md AGENTS.md GOALS.md PLANS.md PROMPTS.md CHANGELOG.md LICENSE .gitignore
  .env.example package.json pnpm-workspace.yaml tsconfig.base.json  [Phase 01]
  apps/
    web/       [Next.js public/private UI and API]
    worker/    [scheduler, adapters, normalization, reporting]
  packages/
    database/ integrations/ monitoring/ contracts/ shared/ ui/
  infrastructure/
    app-platform/  [staging/production specs in Phase 01+]
    docker/        [local development in Phase 01]
    monitoring/    [Kuma/Prometheus/Grafana configs in Phase 03]
    scripts/       [authorized operations in later phases]
    networking/    [reviewed topology/templates]
  docs/
    requirements/  [master-architecture.md, traceability.md]
    architecture/  [overview, data-flow, deployment, monitoring-model, research,
                    repository-structure, phase-00-report]
    assets/        [inventory.md]
    api/           [README.md, openapi.yaml]
    integrations/  [feasibility-matrix, adapter-contract, azure, digitalocean,
                    gcp, firebase, qa, future-providers]
    security/      [threat-model.md, access-control.md]
    database/      [schema.md]
    deployment/    [cost-estimate.md]
    operations/    [runbooks.md]
    testing/       [test-strategy.md, phase-00-validation.md]
    decisions/     [numbered proposed ADRs]
  tests/
    unit/ integration/ contracts/ e2e/ performance/ security/
  harness/
    build/         [backlog.md, phase-00.md through phase-05.md]
    context/       [discovery.md, decisions-and-open-questions.md]
    code-review/   [phase-00.md]
    build-log.md
  .github/workflows/ [later: ci.yml, security.yml, deploy-staging.yml,
                      deploy-production.yml]
```

Do not create empty runnable package manifests or deployment YAML to simulate implementation. Phase 01 will introduce package scripts, environment examples with names only, lockfile, supported runtime pins and CI checks after approval. Dependencies flow apps → shared packages; integrations must not import web UI, and public DTOs must not import provider response types.

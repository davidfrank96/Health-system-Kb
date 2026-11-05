# Lean repository layout

One private repository; one application and one small job entrypoint sharing server code. Phase 00 holds only planning documents, the draft OpenAPI contract and inert directory placeholders. The following tree is the target for later authorized implementation, not existing runnable code.

```text
Health-system-Kb/
  README.md AGENTS.md GOALS.md PLANS.md PROMPTS.md CHANGELOG.md
  LICENSE .gitignore
  package.json pnpm-workspace.yaml pnpm-lock.yaml .env.example  [later]
  apps/web/
    package.json tsconfig.json                              [later]
    src/app/             # private dashboard and REST routes [later]
    src/server/          # auth, db, schemas, checks, adapters, reports [later]
    src/components/      # local reusable UI [later]
  jobs/
    collect.ts           # finite entrypoint importing shared server modules [later]
  infrastructure/
    docker/              # local PostgreSQL config [later]
    app-platform/        # one web + one scheduled job + DB reference [later]
  tests/
    unit/ integration/ contracts/ e2e/ performance/ security/
  .github/workflows/     # local checks; explicit release gates [later]
  docs/
    requirements/ architecture/ assets/ api/ integrations/
    security/ database/ deployment/ operations/ testing/ decisions/
    archive/phase-00-v1/ # immutable superseded packet and hash manifest
  harness/
    build/              # lean backlog and phase-00 through phase-05 plans
    context/ code-review/
    build-log.md
```

Use root pnpm scripts to run the web package, tests and finite job; no workspace package per domain is required. Shared imports are server-only and excluded from browser bundles. The runtime build may produce two commands from the same tested source; neither command depends on a separate long-lived service. Final module paths/toolchain are Phase 01 choices.

Empty placeholders for the old worker, shared-package tree and monitoring/networking/scripts infrastructure were removed only after archiving history. No monitoring configuration, report service or hidden provider enablement is retained. No package manifests, migrations, dependency installations or executable deployment YAML are created in this revision.

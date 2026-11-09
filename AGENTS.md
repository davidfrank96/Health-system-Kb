# Repository instructions

**Current scope (9 November 2026).** Phase 02 merged through PR #2 at be8d2eb. Phase 03 local implementation and fixture tests are authorized on phase-03/infrastructure-health. Stop for owner review before publication or any live collection.

## Git review workflow

Branch from reviewed main. Preserve existing changes and meaningful history. Every merge to main requires a PR and owner review/approval; never automatically merge or force-push main. Prepare changes and evidence locally, scan for secrets, then request commit/push authorization if not already granted for that work. After authorized feature-branch publication, open its review PR with database/API/security/test/browser/documentation evidence and the phase report. Previous-phase publication permission does not authorize a new phase's push.


- Inspect source and Git state; make small scoped changes and preserve unrelated user work.
- Active MVP: one internal Next.js service, one small single-node PostgreSQL, one finite 15-minute scheduled job. No always-running collector, public publishing, extra monitoring servers or runtime AI.
- Target approximately €50/month. No paid API additions; unknown-cost integrations are disabled. Verify effective permissions, price, existing free-allowance use and bounded usage before enablement. Cost alerts are not hard billing caps.
- Never invent assets, live health, costs, successful tests or approvals. Label manual imports, source timestamps, missing/stale data and sampled availability.
- Use approved read-only provider access, safe allowlisted probes, server-side auth/RBAC, protected secrets and isolated development data. Preserve existing QA/security systems.
- Use local, disposable fixtures. Require separate authority for live integrations, cloud resources, IAM changes, deployment, commits, merges, pushes or paid services.
- Later phases require explicit approval. Local tests first; temporary staging and any budget increase require explicit scoped approval. Stop at phase boundaries.
- Update affected docs and ADRs; record changed files, commands/results, failures, risks and limitations in [build log](harness/build-log.md). Tests must reflect real behavior; a build or document check is not runtime assurance.

## Mandatory workflow for Phases 01–05

For each significant task, review the approved requirement and acceptance criteria, implement a small change, write or adjust regression tests, run them, investigate failures, then update the relevant docs and build log in the same change. Document purpose, behavior, dependencies, setup/configuration and implementation status. Update affected architecture decisions, API contracts, migration/schema and security docs while implementing.

Report each significant milestone in the build log and to the owner. Include the requirement, completed and pending work, exact commands, results, defects, blockers and next verification. Use the [test strategy](docs/testing/test-strategy.md) for local fixtures, CI and the mandatory A–F report. Evidence from fixtures and contracts must be labeled separately from running product behavior. A skipped, unavailable or missing test requires a reason and a follow-up.

Before any phase closes, reconcile its acceptance criteria against executed evidence in `docs/reports/phase-XX-report.md`, beginning with Phase 01. Require delivered functionality, executed required tests, resolved critical failures, verified phase security controls, current docs, known limitations and a report ready for review. An open criterion keeps the gate open. Stop for the owner's next-phase decision.

## Database decision (Phase 01 onward)

Use native PostgreSQL 18 for development and automated database tests. Prefer Postgres.app on macOS and match the server major version in CI. Run the application against a persistent development database and run writes/tests against a separate disposable test database with separate identities. Use private sockets or loopback and environment-based credentials. Keep bootstrap and migration permissions outside the web process. Never run tests against production. Use an isolated PostgreSQL service on the GitHub-hosted runner. Local Docker and Docker Compose are outside this workflow. Keep providers mocked or disabled, and keep DigitalOcean disconnected until separately authorized. [Database setup and reset](docs/database/local-development.md).

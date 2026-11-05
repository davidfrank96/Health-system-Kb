# Repository instructions

Current authorization: **Phase 00 lean architecture/documentation revision only**. Read [GOALS](GOALS.md), [PLANS](PLANS.md), [lean requirements](docs/requirements/lean-architecture.md) and applicable designs first. The lean brief supersedes conflicting v1 requirements; `docs/archive/` and ADRs marked superseded are historical, not active instructions.

- Inspect source and Git state; make small scoped changes and preserve unrelated user work.
- Active MVP: one internal Next.js service, one small single-node PostgreSQL, one finite 15-minute scheduled job. No always-running collector, public publishing, extra monitoring servers or runtime AI.
- Target approximately €50/month. No paid API additions; unknown-cost integrations are disabled. Verify effective permissions, price, existing free-allowance use and bounded usage before enablement. Cost alerts are not hard billing caps.
- Never invent assets, live health, costs, successful tests or approvals. Label manual imports, source timestamps, missing/stale data and sampled availability.
- Use approved read-only provider access, safe allowlisted probes, server-side auth/RBAC, protected secrets and isolated development data. Preserve existing QA/security systems.
- During this revision do not install dependencies, implement code, create databases/resources, configure live integrations, modify IAM/infrastructure, deploy, commit or push.
- Later phases require explicit approval. Local tests first; temporary staging and any budget increase require explicit scoped approval. Stop at phase boundaries.
- Update affected docs and ADRs; record changed files, commands/results, failures, risks and limitations in [build log](harness/build-log.md). Tests must reflect real behavior; a build or document check is not runtime assurance.

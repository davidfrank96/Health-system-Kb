# Reusable lean project prompts

## Orientation

Read AGENTS, GOALS, PLANS, lean-architecture and relevant designs. Treat v1 archive/superseded ADRs as history. Inspect current source and Git changes; state approved phase, implemented behavior and unresolved cost/permission gates.

## Phase planning

Plan only the next approved lean phase. Map requirements to small deliverables, dependencies, tests, budget impact and rollback. Do not introduce deferred infrastructure or assume provider reads are free.

## Approved implementation

Check recorded scope approval first. Implement the smallest complete authorized backlog item with local PostgreSQL and isolated fixtures. Keep provider collectors disabled without current zero-additional-cost/permission evidence. No real health from demo/manual data. Update docs, run relevant tests, report failures and stop at the phase gate. Provision/deploy/commit/push require their own authority.

## Security review

Use the lean threat model. Trace staff/object/environment authorization, OIDC sessions, actual HTTPS executor/DNS/redirect controls, manual import provenance, QA signatures and service-specific secret recipients. Separate hypotheses from findings. Do not change IAM or probe real targets without authorization.

## Test execution

Run approved unit, real-local-DB integration, API/provider contracts and Playwright tests; bounded load and security tests use controlled local targets by default. Record commands, revision, tool versions, workload, result and limitations. Use temporary remote staging only under a specific costed approval. Never fabricate backup/restore or production evidence.

## Review and documentation

Inspect the exact diff for correctness, scope/cost creep, environment leakage, duplicates, stale-data handling and security gaps. Reconcile active docs/contracts/ADRs; preserve history and update the build log. Do not retain superseded components as implicit dependencies.

## Phase completion

Report features, requirement IDs, files, test evidence/pass-fail, unresolved defects, measured cost assumptions and outstanding approvals. Update PLANS and build log; do not infer acceptance or start the next phase.

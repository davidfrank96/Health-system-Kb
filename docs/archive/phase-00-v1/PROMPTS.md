# Reusable Codex prompts

## Orientation

Read AGENTS.md, GOALS.md, PLANS.md and the applicable specifications. Inspect Git status and existing source. Report current approval scope, implemented versus proposed behavior, and unresolved dependencies before editing.

## Phase planning

For phase NN, map baseline requirements to deliverables, dependencies, acceptance tests, security boundaries and rollback implications. Do not implement or presume approval. Update the backlog and decision register.

## Approved implementation

Read the recorded approval for phase NN and its exact scope. Implement the smallest complete authorized backlog item. Use verified assets or isolated test fixtures only. Update contracts/docs, execute required tests and report failures. Stop at the approved boundary; deployment and push require their own authorization.

## Security review

Review the approved change against docs/security/threat-model.md and access-control.md. Trace input to sensitive operations and publication. Separate confirmed findings from hypotheses; give evidence and test gaps. Do not change provider IAM or infrastructure.

## Test execution

Run the checks specified for the implemented item, using local fixtures or explicitly approved staging targets. Record exact commands, revision, environment, results and limitations. A build alone is insufficient. Do not fabricate pass results for unimplemented tests.

## Code review

Inspect the actual diff. Prioritize correctness, authorization, environment separation, idempotency, telemetry freshness and regression risks. Cite actionable file locations. Distinguish blockers from optional improvements.

## Documentation update

Reconcile implemented behavior with architecture, API, database, runbooks and relevant ADRs. Preserve assumptions and evidence provenance. Avoid duplicating persistent AI rules outside AGENTS.md.

## Phase completion

Report features/requirements, changed files, tests/pass-fail evidence, unresolved defects/security findings, authorized deployment changes, limitations and next dependencies. Update PLANS.md and harness/build-log.md. Do not declare approval or start the next phase.

# Repository instructions

Current authorization: **Phase 00 documentation and planning only**. Read [GOALS.md](GOALS.md), [PLANS.md](PLANS.md), [the baseline](docs/requirements/master-architecture.md), and applicable architecture documents before work. PLANS.md records phase approval; a completed draft is not approval.

- Inspect existing files and Git state before edits. Prefer small, testable changes; leave unrelated files alone.
- Never invent infrastructure identifiers, verified assets, live metrics, test results, or approvals. Distinguish unknown/stale telemetry from service failure.
- Monitoring integrations are read-only and require reviewed permissions before enablement. Preserve existing QA/security systems and alerts.
- Never commit credentials, personal data, or unrestricted provider payloads. Never expose provider credentials to browsers or public status responses.
- Do not modify production or staging infrastructure, IAM, integrations, deploy, or push without explicit authorization. Stop at phase boundaries for approval.
- Add appropriate validation/tests; record commands, results, failures, changed files, risks, and limitations in [harness/build-log.md](harness/build-log.md).
- Update relevant documentation when behavior changes and record architecture decisions in [docs/decisions](docs/decisions).
- During Phase 00, create documentation and directory placeholders only. Package manifests, application code, migrations, executable deployment configuration, and workflows belong to Phase 01 or later.

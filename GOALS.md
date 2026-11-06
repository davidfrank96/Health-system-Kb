# Lean MVP goals

Help approved staff answer which services are reachable, what trustworthy infrastructure data exists, what QA failed, which incidents need attention and what changed over time.

Seven sections: Overview; Application Status; Infrastructure Health; QA & Security; Incidents & Maintenance; Reports & History; Settings & Integrations. Status is private. Direct HTTPS checks every 15 minutes provide status, HTTP code, latency, last check/success, sampled history and observed downtime/recovery. DigitalOcean is the first infrastructure source; other integrations require proven zero incremental cost. Manual snapshots/CSV provide an honest fallback. Existing QA is reused. Daily/weekly/monthly reports and CSV are generated in the web application from PostgreSQL.

Security, source provenance, environment separation, incident history, backups, proper tests and clear unknown/stale states remain essential. No customer business records, auto-remediation, extra QA runner, SIEM replacement, paid telemetry/identity/notification services, AI calls, public publishing or new billable provider features. Deferred features are listed in [change summary](docs/architecture/change-summary.md).

The owner selected the lean direction, not permission to deploy. Target approximately €50/month including variable allowance; confirm exact account price/tax/FX, job runtime and spending limit before Phase 01 approval. Unsupported/unknown-cost sources stay disabled. Local fixtures must never appear as production health. Single-node resilience, 15-minute blind spots and same-provider failures are explicit release decisions, not hidden guarantees.

Acceptance requires verified initial targets, revised architecture/budget review, role/env/SSRF/import tests, documented measurements and restore verification. [PLANS](PLANS.md) controls phase status; [test strategy](docs/testing/test-strategy.md) sets proposed modest workload targets. Original final target 31 March 2027 remains conditional on access and approvals.

Phase 02 local implementation is authorized on6 November2026. Service availability uses one worst-required-endpoint vote per 15-minute slot, preserving historical enablement/required periods. Target names are scope candidates, not live probing permission. See the Phase 02 plan/report for verified local evidence and the publication gate.

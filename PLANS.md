# Authoritative lean roadmap

9 November 2026: **Phase 01 accepted and merged in PR #1. Phase 02 merged through PR #2. Phase 03 local implementation authorized.** The owner superseded the earlier infrastructure scope. No asset or zero-cost account allowance is yet verified. Dates are retained planning targets, not unconditional commitments.

| Phase | Target | Minimum useful delivery | Dependencies / gate | Status |
| --- | --- | --- | --- | --- |
| 00 | 20 Nov 2026 | Lean architecture, costs, inventory, schema/API, tests, security and roadmap | Owners verify targets, budget/tax/FX/job billing and approve revision | Documentation complete; operational decisions open |
| 01 | 18 Dec 2026 | Next.js, OIDC/RBAC, local PostgreSQL, service inventory and basic private dashboard | Approved 00; local auth/db/access tests; no hosting required | Accepted; merged at f9423c0, hosted CI passed |
| 02 | 29 Jan 2027 | Finite15m collector, history, sampled status and observed downtime/recovery | Local fixtures only; target/SSRF/lock/history/browser evidence | Accepted in PR #2 |
| 03 | 19 Feb 2027 | DigitalOcean metrics first; manual snapshots/CSV; eligible free integrations only | 02; permission and zero-cost evidence, caps, import tests | Local acceptance evidence prepared for owner review |
| 04 | 12 Mar 2027 | Existing QA, internal incidents/maintenance, reports/CSV | 01–03; QA contract, roles and history reconciliation | Not started |
| 05 | 31 Mar 2027 | Full security/performance/recovery evidence, controlled DO release and handover | All gates; budget and explicit resource/deploy approval | Not started |

## Phase 00 acceptance

- [x] Revised baseline retained; previous packet archived with hashes.
- [x] Lean runtime, layout, scope, schema/API, cost controls, security/tests and phased plans drafted.
- [ ] Verify service inventory, endpoint owners and expected safe probe responses.
- [ ] Confirm Google IdP/allowlist/MFA and scoped read-only credentials model.
- [ ] Check account SKU, job eligibility/rate/minimums, expected runtime, currency/tax and <=€50 target; agree actual hard spending limit.
- [ ] Confirm integration price evidence/free-allowance headroom or keep source manual/disabled.
- [ ] Approve 15m sampling/confirmation, retention, realistic recovery and modest workload.
- [x] Owner authorized local Phase 01 implementation and native PostgreSQL. Phase 02 local work is now authorized; publication, live targets and later phases remain separately gated.

Record named approver, UTC time, document/commit revision, exact allowed actions and exceptions in [approval register](harness/context/decisions-and-open-questions.md). Architecture review never authorizes provisioning, paid calls or push by implication. A source may remain manual/disabled while the MVP proceeds; it cannot be silently called “automated”. [Backlog](harness/build/backlog.md) and phase plans supersede the older delivery order.

## Verification and phase review

Apply the [mandatory workflow](AGENTS.md) and [report requirements](docs/testing/test-strategy.md) throughout Phases 01–05. Each significant milestone updates the build log and receives a short progress report. See the [Phase 01 evidence and open gate](docs/reports/phase-01-report.md). Product checks enter the PR suite with their feature, and each phase ends with its own evidence-backed report and explicit decision before the next phase.

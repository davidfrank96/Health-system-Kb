# Authoritative lean roadmap

31 October 2026: **lean Phase 00 revision drafted; review/discovery gate OPEN. Phase 01 NOT authorized.** The owner superseded the earlier infrastructure scope. No asset or zero-cost account allowance is yet verified. Dates are retained planning targets, not unconditional commitments.

| Phase | Target | Minimum useful delivery | Dependencies / gate | Status |
| --- | --- | --- | --- | --- |
| 00 | 20 Nov 2026 | Lean architecture, costs, inventory, schema/API, tests, security and roadmap | Owners verify targets, budget/tax/FX/job billing and approve revision | Review pending |
| 01 | 18 Dec 2026 | Next.js, OIDC/RBAC, local PostgreSQL, service inventory and basic private dashboard | Approved 00; local auth/db/access tests; no hosting required | Not authorized |
| 02 | 29 Jan 2027 | Finite 15m HTTPS job, history, sampled status, observed downtime/recovery | 01; target/SSRF and overlap/idempotency tests | Not started |
| 03 | 19 Feb 2027 | DigitalOcean metrics first; manual snapshots/CSV; eligible free integrations only | 02; permission and zero-cost evidence, caps, import tests | Not started |
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
- [ ] Approve revised Phase 01 local implementation scope explicitly.

Record named approver, UTC time, document/commit revision, exact allowed actions and exceptions in [approval register](harness/context/decisions-and-open-questions.md). Architecture review never authorizes provisioning, paid calls or push by implication. A source may remain manual/disabled while the MVP proceeds; it cannot be silently called “automated”. [Backlog](harness/build/backlog.md) and phase plans supersede the older delivery order.

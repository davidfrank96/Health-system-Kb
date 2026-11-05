# Authoritative roadmap

As of 31 October 2026: **Phase 00 documentation drafted; review and discovery gate OPEN. Phase 01 NOT authorized.** No asset is yet verified through provider evidence. Approval fields below are deliberately unset.

| Phase | Target | Dependency | Deliverable and acceptance | State |
| --- | --- | --- | --- | --- |
| 00 | 20 Nov 2026 | Baseline and local repository | Requirements, verified inventory, feasibility, architecture, schema/API, threat model, test/cost/recovery proposals, approved Phase 01 scope | Draft delivered; inventory and approvals pending |
| 01 | 18 Dec 2026 | Signed Phase 00 gate and separately authorized staging changes | Monorepo, CI, auth/RBAC, migrations, empty-state shell, durable worker skeleton; isolated staging smoke tests | Not started |
| 02 | 29 Jan 2027 | 01; provider permission and asset approval | Azure/DO adapters, capability-tested GCP/Firebase, infrastructure dashboards; timeout/throttle/partial-data tests | Not started |
| 03 | 19 Feb 2027 | 01–02; monitor mapping and publication policy | Approved public status, measured history, incidents/maintenance; privacy and availability tests | Not started |
| 04 | 12 Mar 2027 | 02–03; QA contract and alert owners | QA ingestion, deduplicated alerts, reports and history; replay/delivery/export tests | Not started |
| 05 | 31 Mar 2027 | All previous gates | Performance, security and restore evidence, authorized production rollout, handover | Not started |

## Phase 00 gate

- [x] Baseline preserved; logical/deployment architecture and data flows drafted.
- [x] Database ERD, initial OpenAPI, integration designs, threat model and acceptance proposals drafted.
- [x] Instructions, phase plans, backlog, evidence register, cost estimate and operations drafts created.
- [ ] Product owner approves scope, public components and requirement mapping.
- [ ] Asset owners verify initial inventory and service dependencies with dated evidence.
- [ ] Security owner approves IdP/MFA, scoped credentials, publication role and retention.
- [ ] Infrastructure owner approves region/network topology, cost ceiling, database edition and RPO/RTO.
- [ ] QA owner confirms payload/authentication and safe evidence destinations.
- [ ] Engineering owner approves Phase 01 implementation scope and performance workload.

Approver names, timestamps, approved document revision, exceptions and authorized actions must be entered in [the register](harness/context/decisions-and-open-questions.md). No approval is recorded today. Resolve phase-critical questions there before marking this gate complete. Changes affecting cost, provider writes, public disclosure or recovery guarantees require renewed review.

See [backlog](harness/build/backlog.md) and [phase plans](harness/build/phase-00.md). Missing providers can be explicitly deferred by the owner with UI coverage shown as unsupported; they cannot silently become verified.

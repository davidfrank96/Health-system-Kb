# Lean MVP threat model

## Overview

Historical revision2 design followed by the Phase 02 control reconciliation below. The user-supplied [lean brief](../requirements/lean-architecture.md) replaces the larger runtime. At the revision2 design review, the repository contained planning files and no application handlers or migrations. Phase 01/02 code now exists locally; there is still no authorized deployment. The independent offline architecture review confirmed this and identified finite-job cost/overlap, direct-executor SSRF, manual provenance and authenticated-but-internet-facing ingress as the relevant lean boundaries. No vulnerability or effective deployed control is asserted.

| Proposed component | Evidence / responsibility |
| --- | --- |
| Next.js web | Lean brief sections 3/6/7; staff auth/API, small QA/manual intake, incidents/reports |
| Finite 15m job | Lean brief sections 3/5; approved HTTPS and eligible provider reads, bounded aggregation |
| Single-node PostgreSQL | Lean brief sections 3/8; minimal durable domains, TLS/grants |
| Local/test environment | Lean brief sections 10/11; isolated data/credentials, temporary remote tests only when approved |

| Workflow | Sensitive consumer/resource | Configuration chain | Effective location/recipients | Enforcement / unknown |
| --- | --- | --- | --- | --- |
| Staff login | OIDC/session | Allowlist → client/callback → session → scope | No actual issuer/client/store configured; web/IdP | Proposed library/RBAC; owner MFA policy unverified |
| Probe | Job network executor | Approved URL → DNS/IP validation → TLS connection | No approved target/IP set; target only | Pin validated public address, no redirects, bounded requests; unimplemented |
| Provider read | Job identity/cost authority | Approval evidence → secret reference → IAM/API operation → usage reservation | No identities/scopes configured; job/provider | Effective IAM and zero-cost headroom unverified |
| Data access | Web/job DB clients | Component binding → verified TLS → DB grants | No host/roles configured; one planned DB | Separate least grants; actual enforcement absent |
| Manual import | Parser/DB and CSV renderer | Authorized service/env → preview/digest → commit → private display | No handler; only approved staff data | Bounded schema, manual label, audit, escaping; unimplemented |
| QA sender | Web verifier/DB | Key→sender/service/env → HMAC/replay → run uniqueness | No verified sender/key; proposed webhook | Signature and cross-scope checks; protocol unconfirmed |
| Release/restore | Privileged target change | Approved revision/action → scoped identity → exact resource | No workflow/resource/backup verified | Separate runtime authority; restore test/cost approval outstanding |

## Threat Model, Trust Boundaries, and Assumptions

Protected assets: staff sessions/roles, cloud read keys, target inventory, internal security/QA/incidents, observation integrity, audit/recovery data, quotas and agreed budget. Anonymous callers can contact exposed login/webhook but lack staff/sender identity. A Viewer has only permitted reads. A compromised sender has only its own mapping. An authorized importer controls submitted values, not source authentication. A hostile endpoint can alter DNS/redirect/response content, not our approved connection policy. Untrusted contributors do not have release authority by default.

Trust crossings: browser→OIDC/session→DB; staff input→manual parser/history; job config→DNS/TLS target; job→provider/account billing; sender→QA normalization; stored external text→browser/export; local test→production credentials; build→release; runtime→audit/recovery. Shared process/DB remains a shared compromise domain; component-specific roles limit mistakes but do not guarantee isolation from fully privileged host compromise.

Security objectives: all operational content private; server role/environment enforcement; least-privilege secrets and read operations; actual-executor SSRF defense; manual/source/time fidelity; signed/replay-safe conditional QA; bounded processing/quota/cost; accountable changes and recovery. Failed collection must not prove outage or uptime. No security goal requires deferred monitoring/HA/archive/notification infrastructure.

## Attack Surface, Mitigations, and Attacker Stories

The following table preserves the original design hypotheses and pre-implementation evidence. Use the current control reconciliation below for implemented controls; it is not a deployed-security claim.

| Priority | Scenario and capability gain | Prerequisite / impact | Existing control evidence | Mitigation and required test |
| --- | --- | --- | --- | --- |
| High | Anonymous caller reads private status/CSV or cached response | Missing auth/cache isolation exposes operational data | None implemented | Staff middleware plus per-object checks on every read/export; no-store; unauthenticated route/SSR leakage tests |
| High | Google account outside approved staff or revoked account retains access | Weak allowlist/session lifecycle enables staff access | None | issuer+subject allowlist, owner-enforced MFA, expiry/revocation/state/nonce/CSRF tests |
| High | Endpoint DNS/redirect reaches metadata/private DB/credential endpoint | Job has network reach and executor validation can be bypassed | None | No redirects/IP literals, public-address validation including IPv6/mapped forms, pinned connection/TLS, per-attempt revalidation; controlled rebinding tests |
| High | Operator imports data for another environment or claims provider-authenticated readings | Server trusts payload scope/source, corrupting health history | None | Server-bound membership/source_method, atomic validation/audit, preview digest, timestamp/unit checks, immutable probe history |
| High | QA sender for staging forges production pass or replays/collides event | Signature alone accepted as global authority | None | Per-sender service/env binding, raw HMAC, timestamp, event/run uniqueness; cross-env/replay/concurrent tests |
| High | Runtime/build leaks overbroad cloud credentials | Broad IAM, build secrets or raw log/config dump | None | Read-scope evidence, job-only injection, secret-free untrusted CI, redaction/rotation and negative operation tests |
| Medium | Repeated job starts, retry loops or unbounded series exhaust budget | No runtime/usage bound, shared allowance depleted | None | Nonblocking lock/unique slot, deadlines, no catch-up, bounded attempts/series/reservations; unknown-cost no-call tests; acknowledge billing cannot be hard-capped by app |
| Medium | Large CSV/report/QA input consumes small app/DB resources | Unbounded rows/fields/query period/concurrency | None | 256 KiB/500-row CSV, 128 KiB QA, bounded sync reports and rate limits; rollback/size/load tests |
| Medium | Manual/QA text or evidence link injects HTML/spreadsheet formulas or causes SSRF | Unsafe rendering/export or automatic URL fetch | None | Escape HTML, neutralize CSV strings, link allowlist, never fetch evidence; injection fixtures |
| Medium | Collector outage yields falsely green data or exact uptime claims | Observation/import timestamps confused; missing slots ignored | None | Two-axis freshness, count-based sample coverage, manual labeling, confirmation over slots; gap/correction tests |
| Medium | Local/test process reaches production secrets/targets | Ambient credentials or mislabeled connections | None | Explicit env config, isolated fixtures, outbound allowlists and role deny tests |
| Medium | Runtime compromise erases audits or recoverable history | Broad DB grants or untested backups | None | Insert-only audit, separate migration/recovery role, managed backup evidence and approved timed restore; state DB-owner residual risk |

## Severity Calibration (Critical, High, Medium, Low)

Critical requires evidence of unprivileged remote execution or broad production credential/administrative compromise, not merely a design concern. High can include confirmed unauthorized staff access, exploitable metadata SSRF with useful credential reach, or cross-environment privileged mutation. Medium covers meaningful bounded confidentiality/integrity/cost/availability failures; low is limited non-sensitive exposure without significant new capability. Restrictive network/identity controls can change impact only when verified. Authorized manual assertions and already-held administrator powers are not automatic vulnerabilities.

Remaining proof gaps: actual targets, IdP/MFA, query costs/headroom, job retry/timeout/start behavior, DB grants/TLS, QA contract, import implementation, private route/caching tests and restore capability. Same-provider/single-node outages and no independent alert while the app is down remain explicit release risks. No scan or external security testing was performed in this revision.


## Phase 02 control reconciliation · 6 November 2026

The threat boundaries above remain applicable. Current evidence supersedes their historical “None” cells for local identity, database and probing paths. Auth/session/environment/CSRF regressions pass against the actual app. Monitor configuration is admin-only; web grants cannot approve targets or rewrite observations. The collector has separate credentials; offline approvals are exact URLs and audited. Live default execution is disabled. Tests use only disposable databases and controlled local targets.

The actual Node request path disables redirect/proxy/agent reuse, bounds total attempt time and64KiB response bytes, discards bodies and verifies TLS. DNS validation rejects all forbidden A/AAAA answers before selecting a pinned address; hostname/SNI remains the approved host. Exact fixture capability applies only to literal127.0.0.1 on an approved test DB and is not available through web inputs. Controlled HTTP/TLS tests verify response, redirect, size, timeout and certificate behavior; injected resolver tests cover private/mixed/mapped/rebinding answers. No live public-target or production DNS path was probed.

Dedicated advisory lock/unique slot prevents duplicate requests. Lost connection aborts I/O/commit and leaves unknown evidence. Finite limits and a standalone process watchdog bound local work; remote scheduling, provider timeout and billing enforcement remain unverified. Daily counts preserve failures, missing periods and maintenance; no missing sample becomes green. Unauthorized API reads/writes, environment leakage, invalid cursors/ranges, approvals, role grants and revision conflicts are covered by local tests.

Remaining risks: privileged DB/host owners can change evidence; no independent tamper-proof log or out-of-provider alert. The local app's current database connector intentionally rejects managed/production targets; hosted TLS/network controls, real organization/MFA enrollment and production target permissions are separate release gates. Comprehensive1GiB workload, long-duration process/billing behavior and managed recovery remain Phase 05 evidence. This update records implemented controls and tests; it is not an exhaustive vulnerability scan or production certification.

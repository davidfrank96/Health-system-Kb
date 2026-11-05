# Kbean Health System threat model

## Overview

This is a Phase 00 design threat model, not a vulnerability scan or a claim of deployed protection. Initial repository revision `44cab7c538c8ffa68ac6e8d44380c38334438cd7` contained only README, LICENSE and .gitignore. The initial README line 2 described the mission; no runtime consumers existed. User requirements in [master-architecture.md](../requirements/master-architecture.md), especially sections 4, 8, 9 and 13 of the master specification, supply the proposed architecture. The final [overview](../architecture/overview.md) and [data flow](../architecture/data-flow.md) describe intended controls; they are not implementation evidence.

An independent offline architecture review inspected the initial tree and supplied baseline. It confirmed that publication authority, effective secret recipients, executor-level SSRF enforcement and actual environment isolation were unresolved. This document incorporates those gaps. No confirmed vulnerability or executed exploit is reported.

| Component | Evidence/current state | Planned responsibility |
| --- | --- | --- |
| Public/private Next.js web | No source exists | Approved public projection, staff authorization, signed webhook inbox |
| Worker | No source exists | Read-only provider collection, durable jobs and normalization |
| PostgreSQL | No schema/config exists | Durable state and isolated grants |
| Kuma/Prometheus/Grafana | No deployed stack verified | Approved probes, series, private diagnosis |
| Provider/QA sources | User-supplied candidates only | Authorized external telemetry |

| Deployment or workflow | Resource/capability | Configuration and precedence | Safe effective location | Recipients | Enforcing control | Evidence or unknowns |
| --- | --- | --- | --- | --- | --- | --- |
| Production public | Published records | Approved revision → projection → API/cache | Unset publication schema/route deployment | Anonymous readers | Narrow reader + public DTO allowlist, proposed | Query/cache code absent |
| Production worker | Cloud read credentials | Approved scope → service secret reference → adapter | No reference values configured | Worker/provider only | Provider IAM + runtime injection, proposed | Effective IAM and endpoint scopes unknown |
| Staging worker | Nonproduction credentials | Test account → staging-only binding | Unset | Staging worker/test provider | Separate identity and cluster, proposed | No deployed bindings to verify |
| Production/staging web | Sessions and DB | OIDC config → session store → role/env check | Separate hosts/DB URLs unset | Authorized staff/services | OIDC, server checks, DB grants | MFA policy and grants need proof |
| QA intake | Signed events | Key ID → permitted asset/env → raw-body verification | Proposed webhook path | Ingestion service/authorized readers | HMAC/replay/inbox constraints | Sender protocol unconfirmed |
| Monitoring Droplet | Probe egress and persistent data | Approved targets → Kuma → resolver/connection; Compose → volumes | No targets, listener bindings or mount paths | Targets/engine/engineer | Executor/egress controls, authenticated private admin | Feasibility and exact mounts unverified |
| Archives | Backup/report data | Retention policy → key → bucket/object → download authorization | No bucket/key paths configured | Approved writer/recovery reader | Private encrypted storage + scoped access | Key recovery and restore tests absent |
| CI/release | Deployment authority | Approved commit → tested digest → protected environment | No workflows or deployment credentials | Release service only | Environment approvals/scoped deploy identity | Entire flow unimplemented |

## Threat Model, Trust Boundaries, and Assumptions

Protect credentials, sessions, environment membership, incident confidentiality, public status integrity, provider quotas, telemetry provenance, audit integrity and recovery data. An anonymous caller controls public/webhook input but lacks staff or signing credentials. A Viewer has authorized reads, not mutations/publication. A compromised QA sender has only its own asset/environment scope. A monitored endpoint can return hostile content/redirects or change DNS but does not already control our network policy. Untrusted dependencies/PRs must not gain production credentials.

Boundaries are browser→web/session→DB; anonymous→publication schema; editor→publisher; QA sender→inbox→worker; worker→provider; monitor config→actual probe network; staging→production; build→release; archive→download/recovery. Shared application code does not establish isolation from full web-process compromise. Independent public deployment remains a proposed future improvement. Same-provider failure remains a resilience limitation.

Secrets never belong in public bundles, logs, payload dumps or application config tables. A .gitignore entry is hygiene, not access control. Every read, mutation and export binds object and environment authorization. Health data must distinguish fresh observations from missing/stale sources. No approval is implied by the existence of a document or threshold. Effective resources cannot be resolved until deployment configuration exists; revisit this model in each implementation phase.

## Attack Surface, Mitigations, and Attacker Stories

All rows are **conditional design hypotheses**, not findings. Priority expresses review order, not validated severity.

| Priority | Scenario and capability gain | Prerequisites | Impact | Existing controls | Mitigation / required evidence |
| --- | --- | --- | --- | --- | --- |
| High | Anonymous status caller receives private endpoints/security text via projection, errors or cache | Public code serializes internal DTO or shares cache | Sensitive cross-service disclosure | None implemented | Separate schema/role, explicit field allowlist, private cache policy; public contract negative tests |
| High | Incident editor publishes confidential text without publisher authority or approved revision | Edit and publish share implicit permission | Public disclosure/status tampering | None implemented | Separate publisher capability, preview exact digest, optimistic version, immutable public revisions/audit |
| High | Monitored host redirects/rebinds DNS to metadata/private services | Probe executor has network reach and weak enforcement | Credential theft/internal access | None implemented | Target allowlist, scheme/port limits, redirect validation, pinned resolution and egress control at Kuma/actual executor; prove with controlled tests |
| High | Viewer guesses another environment's asset/report ID or invokes admin mutation | Server authorization checks only UI or role | Cross-environment data or privilege gain | None implemented | Per-request identity/object/env checks; secure export/download authorization; negative role matrix tests |
| High | External login gains session solely by matching domain; revoked user keeps access | Weak allowlist/session lifecycle | Unauthorized staff access | None implemented | issuer+subject allowlist, IdP MFA policy evidence, expiry/revocation/CSRF tests |
| High | Compromised QA key submits another service's results or replays signed success | Signature accepted without asset binding, freshness/dedupe | False health, alert suppression | None implemented | Key→asset/env authorization, raw bytes HMAC, timestamp/ID/digest constraints; collision/concurrency tests |
| High | Staging workload uses production credential or shared queue/destination | Misbound environment configuration | Disclosure, noisy alerts, misleading health | None implemented | Separate clusters/principals/secrets/queues; identity deny tests and deployment review |
| High | Dependency/build input exfiltrates deploy/provider credentials | Secrets available in untrusted CI/build | Runtime compromise/provider data exposure | None implemented | Untrusted jobs secret-free, pin/scan dependencies/actions, tested artifact promotion, isolated deploy identity |
| High | Leaked read credential exposes all team/project telemetry | Overbroad effective role despite app allowlist | Infrastructure intelligence disclosure | None implemented | Review actual scope, narrow account/resource access, worker-only secrets, rotate/redact; record scope limitation |
| Medium | Client or provider floods range queries/webhooks/labels; retries amplify outage | Unbounded inputs/concurrency/cardinality | Cost and service exhaustion | None implemented | Body/range/page/rate quotas, circuit breakers, query budgets, queue backpressure and load tests |
| Medium | Stalled gauge or delayed sample resets health to green | Collection time treated as observation time | Missed outages/unreliable uptime | None implemented | Source recency proof, two-axis quality, gap-aware duration calculations and late-data tests |
| Medium | Report link or QA evidence content leads to SSRF/XSS/CSV injection | Automatic fetching or unsafe rendering/export | Data theft or user compromise | None implemented | No auto-fetch, HTTPS allowlist, escaping, safe links, CSV neutralization and download checks |
| Medium | App compromise alters audit/archive or destroys recoverability | Same runtime role can rewrite audits/backups | Lost evidence and recovery | None implemented | Append-only runtime grants, separate archive/recovery keys, restore drill and retention/holds |

Security assessment: the design is feasible only after these controls are implemented and verified. Risks with highest approval relevance are effective provider scope, executor SSRF capability, public publication authority, MFA enforcement, archival keys and same-provider availability. Risk acceptance owner and expiry must be recorded; no residual risk is accepted today.

## Severity Calibration (Critical, High, Medium, Low)

Critical would require evidence of remote code execution or broad production credential/administrative compromise from an unprivileged entry point. The proposed architecture alone is not such evidence. High includes confirmed unauthorized public release of sensitive incidents, exploitable metadata SSRF with reachable credentials, or cross-environment administrative access. If the target cannot reach sensitive resources, the SSRF impact must be reassessed.

Medium includes bounded private-information leakage, demonstrable alert/health integrity failures or resource exhaustion with meaningful operational impact. Low includes limited non-sensitive metadata exposure or a minor defense gap without a material new capability. Authorized provider reads and already-held administrator powers are not privilege escalation. Absence of code means uncertainty, not a confirmed vulnerability or a “secure” result. Production penetration testing and control validation remain Phase 05 work on authorized staging.

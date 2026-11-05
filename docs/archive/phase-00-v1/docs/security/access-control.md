# Access control and secret ownership

Proposed policy, not implemented. Roles are scoped by environment/product membership; an Admin is not automatically an authorized cloud operator. Public data is separately approved, not a subset selected by arbitrary browser filters.

| Capability | Public | Viewer | Operator | Admin |
| --- | --- | --- | --- | --- |
| Read published status | Yes | Yes | Yes | Yes |
| Read internal assets/metrics/QA/reports in scope | No | Yes | Yes | Yes |
| Export permitted reports | No | Yes, audited | Yes, audited | Yes, audited |
| Create/update internal incidents and maintenance | No | No | Yes | Yes |
| Acknowledge/silence application alerts | No | No | Yes, time-bounded | Yes |
| Users/integration config/thresholds | No | No | No | Yes, audited |
| View audit log | No | No | No | Yes |
| Publish/retract public revision | No | No | Only with separate publisher grant | Only with separate publisher grant |
| Read provider credential values or change cloud IAM | No | No | No | No through this app |

Publisher grant is independently assigned by the security/product owner; default is none. Preview → explicit publish of exact revision/digest → immutable audit and public projection. Two-person review for sensitive/major incidents is proposed pending staffing approval. Concurrent edits cause 409; internal changes never auto-publish. Public DTOs use opaque public IDs and explicit allowed fields, with no internal asset IDs, source labels, private links or internal error messages.

## Identity/session proposal

Google OIDC through a maintained library: verify issuer/audience/signature/state/nonce and PKCE, then enforce explicit subject-bound allowlist and verified identity. Email domain alone is insufficient. Bind issuer+subject; email is display/approved bootstrap evidence. MFA is enforced by the managed IdP policy and must be verified with its owner; a successful Google login alone is not proof of enforced MFA. No local password fallback. Document audited break-glass access separately before production.

Sessions: opaque random token, hashed server-side storage, `__Host-` secure HTTP-only SameSite=Lax cookie, path `/`, no Domain; proposed 30m idle and 8h absolute expiry. Rotate after login/privilege change; revoke on removal and recheck membership each protected request. Unsafe browser methods require CSRF token and Origin validation; GET is read-only. Resource/environment authorization precedes query/export and is tested independently of UI controls. Private responses use `Cache-Control: private, no-store`; cache keys must never mix staff/public or environments.

## Credentials and service roles

| Identity | Proposed access | Owner / rotation |
| --- | --- | --- |
| Public DB reader | SELECT approved publication schema only | Engineering; environment-scoped rotation |
| Private web DB role | Scoped application reads/writes; no migration privileges/provider secret values | Engineering |
| Worker DB role | Jobs, metrics, aggregates, outbox, approved publication transaction | Engineering |
| Migration role | Schema changes in approved release window | Release owner, absent from normal runtime |
| Monitoring provider identities | Per-provider/environment reviewed read scope | Provider owner; prefer short-lived/federated after validation |
| QA verifier | Per-sender/environment HMAC secret | QA + security; 90d target/24h overlap proposal |
| Archive writer / recovery reader | Separate scoped object permissions and encryption keys | Operations/security |
| Deployment identity | Separately approved staging/production deployment only | Release owner; never in monitoring adapters |

Store runtime secrets in approved DO service-scoped encrypted environment management; DB keeps only opaque references, rotation date and owner. No unverified assumption of DO-provided cross-cloud federation. Default 90d long-lived credential rotation proposal, immediate rotation after suspected exposure, and 30/7d expiry reminders. Do not log raw headers, secret-bearing URLs, payloads or config dumps.

Production and staging use separate clusters, principals, secret bindings, callback URLs, job queues, destinations and ideally access groups. Provider tokens can carry broader visibility than the app inventory; document effective grants and residual scope, not just UI filtering. Enablement requires read permission tests and reviewed role definitions; never test absence of write permission by attempting a destructive production write.

Retention proposals: samples 30d, hourly 90d, daily >=12m, incidents/QA/report snapshots 12m, audit 12m, delivery detail 90d, sessions expire+7d; security/privacy owner must approve deletions, legal holds and source-specific exceptions. Avoid raw personal data, crash stacks and public subscriber addresses unless separately designed.

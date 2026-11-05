# Lean access control

All operational UI, status, metrics, QA, incidents, settings, reports and CSV require an approved staff session. Google login/callback and minimal process health are exceptions; QA webhook has its own sender authentication. No anonymous status route, publisher role or public data projection in MVP. Authentication does not mean ingress is network-private.

| Capability | Viewer | Operator | Admin |
| --- | --- | --- | --- |
| Read permitted environment/status/history/QA/reports | Yes | Yes | Yes |
| CSV export within scope | Yes, audited | Yes, audited | Yes, audited |
| Manual metric/QA import | No | Yes | Yes |
| Incident/maintenance management | No | Yes | Yes |
| Target/service/integration settings and user membership | No | No | Yes |
| Audit inspection | No | No | Yes |
| View provider secret values/change cloud IAM | No | No | No through application |

Membership grants are per environment; resource ID possession is not access. Service/endpoint changes require Admin and recorded target approval; integration enablement also requires current permission/no-charge evidence. Admin UI must not manufacture budget approval or broaden cloud scope.

Google OIDC through maintained standard library: issuer/audience/signature/state/nonce and PKCE verification, explicit approved issuer+subject allowlist, verified identity. Domain match alone is insufficient. Confirm managed IdP MFA policy with owner; successful Google login does not prove MFA. No paid identity vendor or local password fallback. Library-owned callbacks/logout must be covered by integration tests.

Sessions: opaque random token hashed in DB, `__Host-` Secure/HTTP-only/SameSite=Lax cookie, path `/`, no Domain; 30m idle/8h absolute expiry proposal, rotation after auth/privilege change, revocation on user removal, membership recheck at each request. Unsafe browser methods need Origin validation and session-bound CSRF token. All private responses use `Cache-Control: private, no-store`; no sensitive data in shared caches or static generation.

Separate runtime secret recipients: web gets OIDC, QA verification and web DB credentials; scheduled job gets collector DB plus approved provider read secrets; migration/release operator has separate time-scoped authority. Service-scoped encrypted runtime configuration, never build variables/client bundles/logs. DB stores references/owner/rotation/evidence only. Long-lived key rotation proposal 90d or on exposure; short-lived/federated only if actual no-cost supported path exists, not assumed.

Local/test execution has isolated PostgreSQL, fake providers/targets, no production secret inheritance. Temporary remote test resources use separate principals/DB/callbacks and approved safe targets, with expiry/teardown. Monitored environment labels do not authorize the deployment to connect to production; outbound allowlist and secret binding must agree.

Executor SSRF controls apply to the scheduled job's actual network connection (see data-flow). Provider adapters use fixed hosts/read methods; no generic HTTP proxy. Manual import routes never fetch source links or accept automatic source_method; CSV sizes/rows/schema, time/unit checks and audited correction protect evidence integrity. QA signatures bind both raw body and sender service/environment; no global signing key.

Append-only runtime audit records auth, denied access, config/import/incident/maintenance/export and cost-gate changes. A DB owner can still alter DB-resident audits; no independent tamper-proof archive is claimed. Keep logs bounded/redacted using existing platform facilities, no paid log product. Backups/recovery authority remains with the owner; managed backup plus tested restore is required before release.

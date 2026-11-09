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

## Phase 01 verification boundary

The implemented routes are in the [API contract](../api/openapi.yaml). The local web verifies OIDC through openid-client with signature verification, state, nonce, PKCE and verified email. Only previously approved issuer/subject pairs with current memberships can establish sessions. The five-minute login-flow cookie is encrypted with JOSE. Opaque session tokens are hashed at rest; only the session-bound CSRF proof is returned to authenticated browser code. Membership/identity changes revoke sessions through database triggers. The runtime DB role cannot grant memberships or rewrite audit events. Staff mutations and their audit records commit together. Verified actor denials record a bounded reason. The local fixture issuer runs in test tooling outside the web process; its one-time codes, signing keys and client credentials are generated per launch. Google production policy/MFA, hosted networking and release readiness require separate evidence.


## Phase 02 verified boundaries

Endpoint/status/history operations require staff sessions and environment membership. Only admins mutate endpoints; operators/viewers remain read-only. Target creation is disabled, exact owner approval is an offline migration-identity operation, and changing a URL invalidates it. Web JSON cannot contain approval or observation fields. CSRF, origin, idempotency and optimistic revision checks protect writes. API URL validation is repeated by the executor and never triggers an immediate network request. Limits cap target counts, response bytes, concurrency, attempts and query ranges.

Collector credentials have no user/membership/configuration write privilege. Fixture HTTP permission requires an exact loopback registry created in an approved test database; it is not an external-target override. Live collection is disabled even if a database target is approved/enabled. Monitoring reads show source times, quality and unknowns; failed execution cannot forge healthy or down observations. See Phase 02 evidence for tested negative cases and [operational instructions](../operations/availability-monitoring.md).

## Phase 03 implementation

Viewers read environment-scoped resource metadata and readings. Operators and administrators can submit and correct staff evidence. Administrators can disable a scoped resource with CSRF, idempotency key and revision. Only the offline migrator registers mappings. The collector can insert through provider_readings and execute bounded retention. The web role can insert staff observations only through manual_readings.

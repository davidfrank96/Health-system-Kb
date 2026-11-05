# Verified inventory and candidate services

**Verified monitored services/endpoints: 0.** These names come from the user brief; no target was probed or cloud account queried. They are not evidence of ownership, availability, instrumentation or free usage.

| Candidate | User-supplied context | Missing evidence |
| --- | --- | --- |
| INSSA Studio | Kbean application | Owner, exact HTTPS health URL, env and safe response rule |
| INSSA Discovery / inssa.us | Website candidate | Owner, canonical HTTPS target, env and permitted probe load |
| INSSA Life | Application/TV/API candidates | Exact service decomposition and approved targets |
| Kbean/KBM services | Other applications/admin services | Identity, owner, URLs and staff visibility |
| Existing DO resources | Droplets/App/database resources | IDs, region, existing metric agent, supported free metric routes/scopes |
| Azure Cosmos/API | Production mentioned previously | Resource/API type and cost evidence; manual by default |
| Firebase staging / production | Claimed staging/production Firebase | Project numbers/owners and eligible existing telemetry |
| GCP CDN/media/storage | Candidate infrastructure | Resources, descriptors, billing-account free allowance/headroom |
| Existing QA/security tools | QA plus Wazuh/Eramba references | Protocol, identity, no-cost access, suite schedules, safe reports |
| Hashio / Fusion | Product identity unknown | Exact vendor/product, no inferred API |
| New Health System hosting | Proposed only | Approved account/region/budget and later deployment evidence |

Per service: stable ID, name/product, environment, owner, criticality, provider/resource references, source evidence/date, verification/approval, authorized staff scope. Per endpoint: exact HTTPS/443 URL without secrets, safe expected response codes, approved by/at, enabled-at/disabled-at, 15m cadence, last check/success and known limitations. Separate production/staging service records even when hosts appear similar; deployment/test environment is a different concept.

Per integration: allowed resource/service mapping, metric names/units/aggregations/limits, existing instrumentation, credential reference, reviewed effective read grants, official pricing/date, shared account allowance and existing consumption/reserve, request/cardinality cap, review expiry, owner and enabled=false until approved. Manual source is always explicit. No status publication flags or publisher mappings in MVP.

Workflow: owner supplies minimal inventory and existing evidence → engineering verifies identities under authorized read-only/cost-safe scope → security reviews actual grants/targets → billing owner approves zero incremental cost and job load → explicitly enable eligible targets later. Missing evidence does not block documenting the design but blocks live activation. Do not install agents/enable exports/APIs or request broad production secrets to fill this template.

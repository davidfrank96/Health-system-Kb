# Asset inventory and verification

**Verified monitored assets: 0.** The names below are supplied candidates, not evidence of existence, ownership, reachability or authorization. No monitoring targets were probed and no cloud account was queried.

| Candidate | Claimed environment/provider | Status | Evidence required |
| --- | --- | --- | --- |
| INSSA Studio | Unknown | User-supplied candidate | Owner, approved URL, environments and dependencies |
| INSSA Discovery / inssa.us | Unknown | User-supplied candidate | Ownership, HTTPS target and public inclusion |
| INSSA Life, TV/API dependencies | Unknown | User-supplied candidate | Components and customer-impact mapping |
| Kbean/KBM backend/admin applications | Unknown | User-supplied candidate | Approved names, endpoints, owners |
| Cosmos DB and Azure APIs | Azure; production mentioned | User-supplied candidate | Subscription/resource IDs, API type, metric definitions, scoped permission evidence |
| Existing Droplets/App Platform/databases/storage | DigitalOcean | User-supplied candidate | Resource IDs, team scopes, region, agent availability |
| Staging project | Firebase staging (claimed) | User-supplied candidate | Project number, owner, enabled services, read-only identity |
| Production project | Firebase production (claimed) | User-supplied candidate | Same; separate credentials and mapping |
| CDN/media/storage resources | GCP | User-supplied candidate | Project/service/resource types and monitoring descriptors |
| QA platform | Unknown | User-supplied candidate | Contract, auth, environments, suite schedule and sample redacted event |
| Wazuh / Eramba | Existing security tools | User-supplied candidate | Owner, supported reference/API, sensitivity policy |
| Hashio / Fusion | Identity unknown | Unresolved | Exact vendor/product, documentation and permission model |
| Health System resources | DigitalOcean proposed | Not provisioned | Approved topology and later deployment evidence |

## Required record before enablement

Use one row/record per environment-specific asset: `asset_id`, product, display name, provider/account, resource type and verified identifier, environment, region, owner, criticality, required/optional dependencies, approved endpoint and protocol, capability/metric IDs and units, interval/source lag/freshness, thresholds, credential reference (never value), permission review, public eligibility, alert authority, last successful sync (nullable), coverage limitations, verified_by, verified_at, evidence_reference and approval_reference.

Verification sequence: owner supplies a minimal inventory export → engineering checks IDs with an authorized read-only identity → records metric descriptors and sanitized response evidence → security reviews effective permissions → owner approves exact probe targets/public mapping → change owner authorizes enablement. Do not request unrestricted keys. Store sensitive endpoint details in a restricted inventory system rather than broadly readable Git documentation. Discovery itself must not enable agents, APIs, exports or probes.

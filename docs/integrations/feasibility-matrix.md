# Zero additional paid API integration matrix

Revision 2. No account-level cost/permission evidence has been supplied; **all live integrations start disabled**. Automatic below means eligible for enablement after approval, not currently enabled or guaranteed free. HTTPS probes can also consume existing hosting requests/egress; check the target owner permits this load.

| Source | MVP method / cadence | Cost gate | Initial state / fallback |
| --- | --- | --- | --- |
| Approved Kbean HTTPS targets | Direct safe GET, every 15m | Approved target, execution/egress allowance and job budget | Disabled until verified; missing, not invented health |
| DigitalOcean | Documented Monitoring REST, every 15m or slower | Free monitoring service; actual metrics, token scopes, agent presence and request/transfer costs reviewed | First infrastructure candidate; manual if unavailable |
| Azure/Cosmos | Manual snapshot/CSV | REST retrieval can cost money; no automated polling until zero incremental cost is demonstrated | Automatic disabled; manual readings clearly labeled |
| GCP | Cloud Monitoring conditional, no faster than 15m | Shared monthly free allowance, existing consumption, bounded series/pages/retries and reserve | Disabled until evidence; manual otherwise |
| Firebase | Existing supported free telemetry only | Underlying GCP quota/cost gate; no new exports or billed features | Conditional; manual approved aggregate snapshots |
| Existing QA | Existing signed webhook, scoped API or manual JSON import | Sender/API/delivery already available at no incremental cost; approved contract | Unverified; structured manual import is supported fallback |
| Security findings | Approved references in QA summaries | Existing source and authorized link; no automated paid scan/SIEM ingestion | Manual/imported references |
| Hashio/Fusion | Unknown product | Exact vendor/resource/API/price/permissions first | Disabled; manual evidence only when identity verified |

Approval record per source: owner, environment/resources, operation names, credential reference, effective read grants, official price evidence/date, billing-account allowance, existing/other-consumer forecast, local conservative cap, expiry/review time and decision. `cost_status = unverified | verified_no_incremental_cost | blocked`; enabled requires verified status and unexpired evidence. Credentials alone never enable an integration.

If usage cannot be bounded or shared headroom ceases to be reliable, pause collection before issuing more requests and show reason/last observation. Do not auto-switch to a paid tier. [Adapter contract](adapter-contract.md), [cost estimate](../deployment/cost-estimate.md), [manual import](manual-imports.md) and [research](../architecture/research.md) specify limits. Provider budget alerts are not guaranteed spend caps.

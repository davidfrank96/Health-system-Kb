# Monitoring and alert model

All numerical values are proposals requiring owner approval. Threshold configuration is versioned per environment and asset capability; unavailable metrics are unsupported, never zero.

## State and evidence

Persist `condition = healthy | degraded | down | maintenance | unknown` and `quality = fresh | stale | missing | partial | error | unsupported`. Keep previous condition/time for context. Unknown is the displayed service condition when there is insufficient fresh evidence; stale previous health may be shown with its original timestamp but cannot contribute to “all operational”. Collector failure describes the measurement path, not service downtime.

Public statuses are `operational | degraded | partial_outage | major_outage | maintenance | unknown`. Unknown is an explicit extension to the baseline to prevent misleading green pages. Public impact comes from approved component mappings and confirmed evidence or an authorized publication. Internal incidents are private by default. For overall status: confirmed major outage > partial outage > degraded; otherwise unknown if any required component is unknown, then maintenance if any are in maintenance, otherwise operational. Show coverage alongside known impacts. Scheduled maintenance masks neither unknown coverage nor unrelated outages.

Dependencies are typed required/optional and cycle-checked. Propagate impact only through approved required dependencies; a failed collector never cascades a Down condition. Define customer impact on the component inventory instead of using worst CPU utilization as product status.

## Freshness proposals

| Source | Collection | Expected source lag | Stale after observation age exceeds |
| --- | --- | --- | --- |
| Website/API | 60s probe, 30s scrape | 30s | 180s, and only with verified probe recency |
| Azure/DO | 5 min | 5 min provisional | 15 min |
| GCP | 5–15 min | descriptor-specific, initially 5 min | 3 × interval + verified lag |
| Firebase operational | 15–60 min | descriptor-specific | 3 × interval + verified lag |
| Crashlytics daily | Daily | daily batch, initial export can take longer | 48h steady-state proposal; label daily data |
| QA | Completion event / 15 min fallback | sender-specific | Per-suite expected schedule + grace; no assumed daily suite |
| TLS | Daily | one run | 48h |

Reject future timestamps beyond 2 minutes or quarantine as clock errors; preserve provenance. Report source age and collection age separately. A successful API call with no recent samples does not reset source freshness. Daily Crashlytics figures cannot be presented as real-time availability.

## Availability arithmetic

Clip all intervals to `[start,end)` in UTC. Let S be observed successful seconds, F observed failed seconds, U unknown seconds, M explicitly approved maintenance seconds. With maintenance-excluded reporting, split maintenance first and use E = window − M = S + F + U. Coverage = `(S + F) / E`. Observed availability = `S / (S + F)` when known duration > 0. Conservative lower bound = `S / E`; upper bound = `(S + U) / E`. If denominators are zero, return null with a reason, not 100%. Always return all durations and the maintenance policy. Also expose an inclusive view for audit; it recomputes categories without excluding M.

Proposal: exclude approved planned maintenance from headline availability but display excluded duration. Require >=99% coverage for a headline percentage; otherwise display “insufficient coverage” and the observed estimate plus bounds. Example: S=50m, F=5m, U=5m in a 60m eligible window gives 91.67% coverage, 90.91% observed availability, and 83.33–91.67% bounds; no unqualified 90.91% headline. Never average daily percentages: sum duration numerators/denominators across buckets. Degraded but successful requests count as available; report degradation duration separately.

Each observation covers at most its configured interval, clipped at the next sample and freshness limit. Missed intervals remain unknown; repeated scrapes of one observation are deduplicated. Scraped gauges provide sampled availability, not guaranteed exact probe-event uptime. The 90-day bar labels daily coverage, maintenance and incidents, with unknown before monitoring starts. Store daily rollups for >=12 months; do not fabricate pre-onboarding history.

## Alert defaults

| Condition | Trigger / recovery | Initial severity | Authority |
| --- | --- | --- | --- |
| Critical probe | 3 fresh consecutive failures / 2 successes | Critical after confirmation policy | Kbean, if existing owner agrees |
| API errors | >5% for 10m with >=100 requests / <2% for 10m | Warning, escalate with impact | Existing provider or Kbean, choose one |
| CPU/memory/disk | >85% / >85% / >80% sustained 15m; clear below 75/75/70% for 10m | Warning | Asset-owner assignment |
| Cosmos RU/throttle | RU >90% for 15m indicates pressure; 429 ratio >5% for 10m with >=100 requests warrants investigation | Warning, not Down | Azure or Kbean |
| Collector | Freshness threshold exceeded / 2 fresh collections | Warning; critical for monitoring blind spot | Kbean |
| TLS | <30d warning, <7d critical / renewed valid certificate | Warning/critical | One selected authority |
| QA | Approved critical suite completed failed / subsequent accepted pass | Warning or owner-defined critical | QA or Kbean |

Never assume memory “used” = total − free where available memory is more appropriate. Derive CPU utilization from interval counters, not absolute cumulative values. Validate each metric's aggregation/unit before thresholds.

Alert states: pending → firing → resolved; acknowledgement and silence are separate metadata. Unknown data interrupts pending evidence and marks firing alerts evidence-lost; it never auto-resolves them. Default 30-minute duplicate cooldown, one firing/recovery notification, escalation only after an owned policy. Maintenance suppresses selected deliveries, not observations/audits; reevaluate fresh evidence after maintenance. No notification destinations are configured.

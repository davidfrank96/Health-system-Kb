# Sampled health, history and freshness

Phase 02 implemented rules,6 November2026. Default availability sampling is one slot every 15 minutes. Health has two axes: condition `healthy | degraded | down | maintenance | unknown` and quality `fresh | stale | missing | partial | error | unsupported`. API/UI always show source method and age; manual snapshots never certify automatic availability.

## Checks and confirmation

Per-endpoint result: success, failure or unknown. Store scheduled slot, actual observation/collection times, HTTP code if received, latency, attempts and safe failure category. A transport failure does not invent an HTTP response. One initial attempt plus at most one bounded retry belongs to one slot and provides one vote, not two consecutive checks.

First failed fresh slot → suspected issue/degraded; two consecutive eligible failed slots → confirmed sampled downtime record, first_failed_at and confirmed_at retained. Two consecutive fresh successes resolve it, storing first_recovery_at and resolved_at. Missing, skipped or maintenance slots break the consecutive sequence; they neither confirm nor clear an outage. A pending confirmed outage with stale evidence is shown with stale/unknown status, not automatically resolved. Known global collector/network failure is unknown, not a mass service outage. At 15m intervals detection/confirmation can take approximately 15–30m plus scheduling/runtime delay; rapid recovery can be missed.

Status per service uses approved required endpoints: any confirmed down → down; otherwise any failed/slow required endpoint → degraded; otherwise missing/stale required endpoint → unknown; otherwise active maintenance → maintenance; otherwise healthy. Show maintenance and known issues separately. Do not add automatic dependency propagation in v1. Default latency warning >2s for two consecutive valid slots, clear after two <1s, subject to endpoint owner approval.

Availability freshness: actual last observation older than 35m is stale (two slots plus 5m tolerance); no observation is missing. Expected slot coverage is separately computed, so a missed slot can show a gap before the age threshold expires. DO metrics collect no faster than 15m and are stale after 45m plus verified provider lag. Other sources use their verified intervals/lag. Manual snapshots default to 24h maximum age unless a metric-specific policy is approved; show “manual, observed at, entered at” even when recent. QA freshness uses the suite's expected execution schedule, not a fabricated daily cadence. Reject future observation times beyond 2m clock tolerance.

## Availability method: scheduled samples, not continuous duration

Use 15-minute UTC slots whose scheduled instant lies in `[start,end)` and whose target was enabled. Before onboarding is not monitored, not successful. Exclude only slots whose scheduled instant falls within approved maintenance; return excluded count. Of eligible E slots, S successful, F failed and U unknown/missing satisfy E=S+F+U. A retry yields one final slot outcome; collector failures are U. First failed samples count F even before downtime confirmation.

Coverage = `(S+F)/E`; observed sampled availability = `S/(S+F)`; conservative sample lower bound = `S/E`, upper bound = `(S+U)/E`. Zero denominators yield null with a reason. These are bounds on missing samples, not bounds on actual continuous uptime. Always label the percentage “sampled availability (15m)”; >=95% coverage is required for a prominent percentage, otherwise show insufficient coverage and an explicitly qualified estimate. Never remove the sampled label at 100% coverage.

Example: 96 eligible daily slots, 90 successes, 2 failures and 4 unknowns → coverage 95.83%, observed availability 97.83%, sample bounds 93.75–97.92%. A one-minute outage between successes may be invisible. Do not state observed downtime intervals as exact customer downtime: first failure/confirmation/recovery observation timestamps bound what was seen; estimated elapsed duration is labeled and retains gaps.

Daily summaries retain counts, maintenance/not-monitored slots, latest observation watermark, method version and manual/automatic separation. Recompute recent affected days after eligible corrections; sum counts over 7/30/90 days, never average daily percentages. Raw checks/snapshots up to 30d, daily summaries12 calendar months. No hourly pipeline or partitioning required. Maintenance changes affecting summarized periods require an audited recomputation while evidence remains; older periods cannot be silently rewritten.

## Issues instead of a new notification platform

Overview flags confirmed downtime, prolonged degraded latency, stale collectors, unsupported/disabled integrations, capacity threshold breaches and failed QA. Thresholds are per approved metric (e.g. CPU >85% or disk >80% across two valid samples), not automatic proof of outage. No paid/external alerts, public subscribers, escalation engine or delivery SLO in MVP. Preserve existing provider alerts; operators use the private dashboard and existing authorized operational channels. Operational silence during complete system failure is an acknowledged limitation.


## Implemented configuration and service aggregation

Default failure/recovery thresholds are2 distinct consecutive eligible slots, configurable2–5. Slow threshold500–9000ms (default2000), clear threshold100–8000ms (default1000, below slow); two slow observations set a warning and two fast observations clear it. A configuration revision breaks pending streaks but keeps confirmed outage evidence. A retry never supplies an additional slot. DNS/network-wide uncertainty, policy rejection, oversized response and collector failure are unknown/error. TLS, refused connections, timeout and unexpected status remain distinct target failures. No observation means unknown; no synthetic green fallback.

History combines historically required endpoints at each scheduled instant: F if any eligible endpoint failed, otherwise U if any is unknown, otherwise S if any succeeded; all-maintenance gives excluded M and no eligible monitor gives N. This yields one vote per service slot, not an average across endpoints. Optional endpoint observations remain visible but do not determine service health. Enabled/required periods survive edits; first failures count F before confirmation. Daily96-slot codes retain exact rolling-window count boundaries for 24h/7d/30d/90d without storing response content. Queries are bounded to 90days; sums are over counts. See the [retention and troubleshooting guide](../operations/availability-monitoring.md).

Status freshness is evaluated on each API read; refresh the panel to re-evaluate age. Open events with stale evidence are not resolved. Observed event spans use actual observation timestamps; controlled test scenarios intentionally compress several synthetic scheduled slots into a short local run and must never be read as production availability.

## Phase 04 use of historical evidence

Active approved maintenance excludes only matching service slots; cancelled future windows do not count. Staff cannot edit an already-started window. Operational incidents are independent of sampled downtime. Daily/rolling/monthly reports use the same slot combiner and count denominators as status history. Retained metric sums/counts and raw samples are grouped by UTC day, service, provider, resource, metric and source method. No percentage-of-percentages or implied continuous coverage.

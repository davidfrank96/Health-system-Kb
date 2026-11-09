# Operating QA, incidents, maintenance and reports

Use the environment selector before reading or changing evidence. The three sections run in the existing staff application. A viewer can inspect and export authorized records; an operator or admin can enter evidence and manage incidents and maintenance. UTC is used throughout.

## Record a completed QA run

In **QA & Security**, select the service, enter the original run ID, suite, terminal state, timestamps, case counts and source reference. The form is for simple entries; paste a completed run JSON object for failure summaries, version, report links and security references. A text ticket/reference works without an evidence-host configuration. Do not paste customer data, logs, secrets or tokenized links. Only HTTPS references on an exactly approved hostname are allowed. The app does not fetch those URLs or authorize access at the destination.

A manual save records the individual staff member, receipt time and original completion time. A signed receipt uses the configured source, never the staff actor. An identical retry is safe. A changed terminal result under an existing identity is a conflict: retain the original and document the correction under a distinct source reference and run identity. Filter by environment, service, suite, status and time range. Flaky cases are already included in passed/failed. Missing runs do not imply success. A verified schedule is required for age-based stale/fresh labels; the test harness supplies one synthetic cadence.

## Investigate and resolve

Create an incident under **Incidents & Maintenance**. Choose the verified service, severity and owner; record the initial statement and the observed start if known. Initial state is investigating. Add evidence by stored downtime-event ID, endpoint ID plus UTC check slot, metric ID, failed/error QA record ID, or the approved URL of a finding already referenced for this service/environment. A reference records an association, not causation. Follow evidence in its source section. External systems enforce their own access control. Source records may age out under their own retention policy.

Add dated investigation notes through identified or monitoring, return to investigation if necessary, and resolve with a written outcome. Each revision records the staff actor and both stated and recorded timestamps. Resolved records are terminal. A conflicting revision returns 409; refresh, read the other update, then reapply only the remaining change. A sampled downtime event remains distinct from an operator incident; no event creates an incident automatically.

## Schedule maintenance

Choose an affected service and enter the UTC start/end, title and reason. Windows are half-open and may last up to 30 days; windows for a service must not overlap. Edit or cancel before the scheduled start. Active, completed and cancelled windows are read-only. Cancelled windows remain visible but no longer exclude slots. Neither scheduling nor cancellation changes raw health checks. There is no retrospective editing or recomputation workflow in this phase.

## Read or export a report

In **Reports & History**, choose an environment, UTC reporting date and daily, trailing 7/30/90-day or calendar-month period. Today stops at generation time; the start is inclusive and the end exclusive. Change the evidence category to inspect a series. The signed-in CSV download uses the same scope, boundaries, values and quality labels. Report records include source, observation time, metric identity, unit and coverage. A 413 means to shorten the period; the server does not return a misleading truncated report.

Availability sums service slots, excludes maintenance, and reports unknown independently from failure. A service with no eligible evidence has unavailable observed availability. Metric means use sample counts, include raw and retained contributions without double-counting, and are not continuous usage or network totals. Retained metrics cover whole UTC days. Provider collection state is labeled **now**; historical error details cannot be reconstructed. A monthly comparison needs observed samples on both sides; partial months compare equal elapsed spans capped at the prior month length. Historical incident state uses what staff had recorded by period end. A late resolution note preserves its separately reported occurrence time. Staff incident times and sampled confirmations serve different purposes.

## Reproduce and troubleshoot locally

From the repository root with Node 22 and native PostgreSQL 18 available:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit
NEXT_TELEMETRY_DISABLED=1 corepack pnpm build
corepack pnpm test:e2e
corepack pnpm test:db
```

The final command creates a disposable database, runs forward upgrades twice, checks a separate restore on the native launcher, and exercises the built app with a synthetic OIDC issuer and scoped fixture sender. The local launcher manages its own credentials. For a development walkthrough use `corepack pnpm local` after building; enter your own synthetic manual data. No webhook sender is enabled there. No persistent development reset is needed.

403 indicates a missing role, environment membership, origin/CSRF proof or sender scope. 409 indicates a changed revision/identity or overlapping schedule. On a 503, retry reads after recovery or resend an identical mutation/event; a webhook response is returned only after commit. Re-sign the original bytes with a fresh timestamp if the original signature has expired. A 429 requires waiting for the next minute. Do not troubleshoot by enabling a provider, weakening scoped grants or adding credentials to the repository.

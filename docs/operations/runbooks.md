# Lean operations runbook drafts

Procedures to finalize after authorized implementation/deployment. No command here authorizes provisioning, provider changes or spending. Record exact environment/target, actor, approved action, time and result.

## Routine review

Owner checks internal overview, last successful scheduled run, stale/disabled sources, HTTP status/latency, active downtime/incidents, DB storage and available backup evidence. Use existing account tools/manual billing review for cost and hosting failures. There is no independent monitoring infrastructure: if the app/DB/provider is down, its own dashboard cannot guarantee notification. Name duty/backup/cost owners before release.

## Failed scheduled collection

Inspect safe run outcome and slot coverage → distinguish target failure from shared DNS/egress, DB or startup failure → leave unknown gaps visible → stop runaway invocations through approved app job controls if needed → correct configuration within authority → resume next scheduled slot. Do not replay missed HTTPS checks or synthesize historical successes. Review overlap lock/unique slot and request/runtime counters. Failed lock connection aborts work; no stale process may continue spending indefinitely. Any platform retry/timeout mismatch blocks release until resolved.

## Cost guard and source enablement

Before enablement verify resource scope, current pricing, shared account headroom, worst-case request/series cap, cost evidence expiry and owner decision. Keep Azure/unknown sources manual unless zero incremental cost is demonstrated. On uncertain/exhausted allowance pause optional provider collection, show last source age/reason, and notify owner using an existing authorized channel. Alerts/counters cannot cap provider bills; owner must stop billable resources/loops under the agreed procedure. Do not auto-upgrade or add a paid fallback. Manual probe/metric requests are subject to the same target/cost rules.

## Manual import and corrections

Check service/env/metric/source and actual observed_at; preview normalized rows/errors; confirm exact digest; commit once. Verify row counts and manual badge, audit and original observation time. Errors reject entire file. Correct using supersedes ID and reason; never overwrite automatic probe results or treat imported time as fresh observation. Do not fetch evidence links, attach raw logs or upload secret-bearing files.

## Incidents and maintenance

Review fresh observations; confirmed sampled downtime and its observation bounds are distinct from inferred actual outage duration. Operator creates an internal incident with owner/severity/service/env and timeline. Maintenance records approved start/end and affected service; exclusions are visible in sampled history. Recovery needs fresh evidence; stale collectors do not resolve incidents. No public publishing/subscriptions/delivery engine in MVP. Staff may communicate through existing channels under normal authorization, not a new app integration.

## Credentials and deployment rollback

Security/provider owner rotates exposed or expired key through an explicitly authorized provider process, updates only its runtime recipient, verifies permitted cost-safe reads and checks redaction. Never paste secrets into Git/chat/tickets. QA overlap window is reviewed and bounded. Deployment rollback uses last tested compatible artifact/revision; disable newly harmful job work, preserve observations/audits and verify private access. Forward repair for incompatible migrations requires review; no automatic destructive down migration.

## Backup, restore and temporary-test cleanup

Confirm managed backup/PITR window and operator access. Local restore tests check schema/data. Before an actual managed rehearsal, approve exact temporary cluster plan, maximum hours/cost, owner and teardown time. Restore to a new isolated DB, disable collection/QA intake, use test credentials and safe URLs, verify rows/constraints/roles/reports, measure achieved data-loss point and recovery time, record evidence and then delete only authorized temporary resources. Read back account state/billing evidence to confirm cleanup; do not assume a successful script did so. Production secrets must not enter test runtime. If the cost does not fit, obtain revised approval before running, not after.

## Reporting and retention

Reports read stored evidence with environment/window authorization and bounded work; export CSV safely, no third-party document service. Preserve generation time, observation coverage and manual-source labels. Recompute daily summaries before raw cleanup; delete bounded batches only after watermark/holds review. Missing data stays missing. Log export/import/config changes with safe identifiers, no payload dump.

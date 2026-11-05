# Operational runbook drafts

Design procedures only. Named operators, exact service IDs, commands, dashboards, credentials, escalation contacts and approvals must be filled from verified deployment evidence. Do not execute provider changes from these drafts. All actions record actor, UTC time, environment, ticket and outcome.

## Routine checks and self-monitoring

On duty: inspect independent public/API check, worker heartbeat age, DB readiness, queue delay, provider error/freshness, stack reachability, disk capacity and backup outcome. Ownership and escalation roster are pending. A healthy web process is not proof of a live worker. Liveness reports only process status; readiness checks critical local DB/schema dependencies with timeouts, not every external provider. Public health endpoints reveal only ok/unavailable, no internal hostnames.

## Failed/stale collector

Confirm affected integration/environment and source age → compare permission errors, quota, network and source latency → distinguish provider failure from collector failure → pause repeated authentication retries and alert the integration owner → rotate only through authorized secret process → perform bounded read verification → resume and backfill only retained bounded windows → confirm coverage and absence of duplicate events. Never mark the service Down solely because collection failed.

## Confirmed incident and public update

Check fresh independent evidence and affected dependencies. Operator creates internal incident, severity, owner and investigation timeline. Publisher reviews a sanitized public revision against approved components and explicitly publishes its digest. Update internal evidence separately; public updates need a new approval. Acknowledge deduplicated alerts, use time-bounded silences, communicate via configured authorized channels. Resolve only with fresh recovery evidence and record duration/data gaps. Public retraction preserves audit; notifications already sent cannot be recalled.

## Monitor changes and SSRF

Verify asset approval, owner, environment, exact protocol/host/port, DNS/resolution/redirect policy and alert authority. Configure Kuma through the approved manual interface; record monitor ID and change evidence. Validate outbound executor/egress defenses with controlled targets before enabling a new target class. Internal probes require a separate narrow reviewed path; metadata services are never broadly allowlisted. Roll back by disabling the specific new monitor and keeping its history.

## Credential exposure or rotation

Security owner determines affected secret reference/recipients, revokes and replaces through provider-specific approved workflow, updates worker-only binding, tests allowed reads and redaction, and checks access/audit evidence. Do not paste credentials into Git, chat or tickets. For QA rotation, overlap old/new keys for at most the approved 24h then revoke old key; test signature rejection. A permission expansion requires renewed review.

## Backup and restore

Check managed backup freshness daily and encrypted archive completion/checksums. Rehearse monthly in isolated staging: obtain approved recovery access → create restored cluster from selected recovery point → verify schema/counts/constraints/incident/QA records and publication isolation → reset notification sinks and disable collectors before starting restored services → test read paths/jobs → measure data loss and elapsed time → record achieved RPO/RTO → authorized cleanup. Restore creates new resources and incurs cost, requiring explicit operational authorization. Never connect restored staging services to production secrets/destinations. Retention policies/holds must be checked before purge.

Restore monitoring volumes/configuration into isolated hosts, verify pinned image compatibility and ownership, map known monitors and confirm history/recency. Retain archives and keys independently of application credentials. A readable archive is not a verified restoration.

## Release rollback

Stop rollout on failed readiness/error/authorization thresholds. Revert to the previously tested immutable artifact if schema-compatible, pause harmful jobs, preserve evidence and verify public/private reads. Apply forward repair for incompatible migrations only with approval; restore/switch DB as a separately approved recovery action after a data-loss assessment. Validate queue leases and notification idempotency after restart. No automatic destructive schema rollback.

## Notification or reporting failures

Inspect outbox/delivery state and source receipts; retry with stable dedupe key and bounded backoff. Avoid manual replay without checking possible delivery. Report failures visibly and preserve immutable inputs; re-generation creates a new report revision. Authorize exports at generation and download, redact content and neutralize spreadsheet formulas. Missing coverage stays visible in HTML/CSV/JSON.

## Regional/provider outage

Independent second-region checker raises an alert through its own route. State whether primary status site itself is unavailable. Execute only an approved recovery/failover plan; no DNS or resource migration is implied here. Entire-DO outage affects both regions; accepted contingency and customer communication route remain decisions for the owner.

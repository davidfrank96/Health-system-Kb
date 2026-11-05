# Lean Phase 02: Availability monitoring

Target: 29 January 2027. Status: not started; not authorized.

## Dependencies

Phase 01 gate and verified owner-approved safe endpoints.

## Scope

L02-1 through L02-4: finite 15m HTTPS job, slot/lock persistence, history/status/latency and observed downtime/recovery.

## Verification

Controlled DNS/redirect/IP/TLS/size/time tests, concurrency/duplicate/crash tests, sample counts and two-slot confirmation, bounded runtime.

## Acceptance

Sampled label/gaps never hidden, no skipped check becomes Down, no permanent scheduler; live tests only separately approved.

## Rollback

Disable specific target/job config, preserve historical evidence, revert compatible entrypoint; never replay missed probes as past observations.

## Completion record

Record requirements, files, commands/results, unresolved defects, cost/permission evidence, limitations and approved actions in the build log. Stop at phase boundary; no deployment/commit/push is implied.

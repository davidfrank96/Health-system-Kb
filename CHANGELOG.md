# Changelog

## Phase 01 · local foundation

Implemented the seven-section internal dashboard, OIDC sessions and environment RBAC, service inventory, native PostgreSQL 18 development/test workflows, migrations and disabled job entry point. Added local and PR verification. [Phase acceptance report](docs/reports/phase-01-report.md).

## Unreleased — lean Phase 00 revision, 31 October 2026

- Replaced active larger/public architecture with one internal web app, small single-node PostgreSQL and finite 15-minute job.
- Revised cost model to $27 fixed base/$35 pre-tax/FX planning envelope with ~€50 target and unresolved account billing gates; no hard-cap claim.
- Default-disabled unknown-cost integrations; DO first, manual metric/CSV and existing QA fallbacks; no paid APIs or runtime AI.
- Simplified schema/API/layout, staff workload, recovery targets and all phase plans; preserved security and real testing requirements.
- Preserved 52 original planning/contract/license/ignore files with SHA-256 manifest in docs/archive/phase-00-v1; marked prior ADRs superseded and added ADR0007.
- Removed obsolete empty placeholders only. No app implementation, dependency install, cloud/configuration change, commit or push.

## Earlier Phase 00 packet — superseded history

Original architecture/specifications and local document validation were produced earlier on 31 October 2026. Their exact files/results remain in the archived packet; conflicting requirements are no longer active MVP scope.

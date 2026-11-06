# Phase 01 foundation acceptance report

**5 November 2026 · Local gate ready for owner review · Branch phase-01/foundation · Uncommitted work against 74fa0f1652646007f09a1968a95d727ce3edfd9d.**

## A. Implementation summary

| Item | Delivered and verified locally |
| --- | --- |
| L01-1 · Web foundation | One Next.js/React/TypeScript application, responsive shell and seven private sections. Health probes expose process/storage readiness only. |
| L01-2 · PostgreSQL | Native PostgreSQL 18, persistent development and disposable test databases, two versioned migrations, schema checksums, distinct web/migration identities and a tested local restore. |
| L01-3 · Staff access | Standard OIDC code flow with PKCE and signed identity tokens, approved issuer/subject membership, opaque secure sessions, expiry/revocation, environment roles, CSRF and audited service changes. |
| L01-4 · Dashboard and inventory | Scoped list, create, detail and revision-checked edits. Admin manages inventory; viewer and operator are read-only here. Status is unknown without observations. Navigation, loading, empty, denied, conflict and dependency-error states are present. |
| L01-5 · Verification | Local unit, integration, security, browser and static checks. PR workflow configured with an isolated PostgreSQL 18 service. First hosted run pending. |
| Monitoring-job foundation | Finite manually invoked entry point reports disabled and zero attempts. No scheduler, probe execution or active adapter. |

Infrastructure readings, QA ingest, incidents, maintenance and reports have private section entry points and explicit empty states. Their collection and management workflows belong to later phases. Postgres.app is preferred on macOS. This machine used its existing Homebrew PostgreSQL 18.3 installation.

## B. Architecture and code changes

The web app lives in apps/web, with shared presentation components and server-side identity/database modules. Versioned migrations create users, memberships, sessions, services, inactive endpoints and audit_events plus schema_migrations. The migrator uses an advisory lock, a transaction and digest checks. The web receives restricted DB credentials. A separate owner command manages staff approval. Root package scripts start the app, exercise the native database lifecycle and run verification.

The [API contract](../api/openapi.yaml) identifies seven implemented-local operations among 33 designed operations. Implemented routes include me, services and process probes. The OAuth login/callback/logout paths are documented in the [API guide](../api/README.md). Key packages include Next.js 16.4.5, React 19.3.1, pg 8.23.1, openid-client 6.8.9, JOSE 6.2.15, Zod 4.6.7 and Tailwind CSS 4.3.4. The lockfile records resolved versions. No new paid service or hosted infrastructure was introduced.

## C. Testing report

Final local environment: macOS arm64, Node 22.23.2, pnpm 10.34.9, native PostgreSQL 18.3, Vitest 5.1.0 and Playwright 1.64.1. Chromium ran at 1440×900 and 360×800. Commands below use the repository root and pinned pnpm via Corepack.

| Executed suite | Passed | Evidence |
| --- | ---: | --- |
| pnpm test:unit | 40 | 35 security-contract checks plus implemented validation, role/environment lookup, CSRF/session binding, body limits and local DB configuration guards |
| pnpm test:e2e | 18 | Browser-context isolation; built app anonymous routes, storage unavailability, synthetic OIDC rejection; separate component fixture for seven sections, responsive layout, loading, retry, empty and conflict states |
| pnpm test:db · Vitest | 2 | Live restricted connection and migration/permission/data constraints against the disposable native database |
| pnpm test:db · authenticated Playwright | 28 | Actual built app, signed loopback issuer and PostgreSQL. Login, rejected identities, cookie attributes, logout replay, idle/absolute expiry, membership revocation, seven sections, environment/role denial, service create/edit/readback, CSRF and input refusal, optimistic conflicts and concurrent idempotent replay, deliberate PostgreSQL read timeout, visible loading/error and successful retry after lock release |

**88 tests passed, 0 failed, 0 skipped in the final run.** The same source also passed installation against the frozen lockfile, TypeScript, Biome, optimized Next.js build, OpenAPI validation, actionlint and shell syntax checks. pnpm audit returned no known vulnerabilities. Gitleaks checked Git history and changed/untracked project files with the existing two reviewed historical checksum exceptions. Local job invocation reported zero probes.

Outside the numeric test counts, the launcher created a native test cluster, applied migration 001, inserted a fixture identity, applied 002, replayed both migrations and verified the identity survived. A native pg_dump archive restored into a separate database and recovered the fixture identity. The CI service connection, upgrade and integration branch also passed against a separate native PostgreSQL 18 instance on loopback TCP. A separate run started the persistent development database, signed in as a synthetic admin and rendered the empty overview. The review process was stopped afterward.

**Failures investigated.** An initial browser locator matched both the sign-in alert and Next.js's route announcer. The scoped locator fixed this. An overly restrictive referrer policy yielded a null Origin on the synthetic issuer form. The same-origin policy preserved origin checks and the browser rejection/positive paths passed. A later browser run caught a stale inventory list after successful persistence. The list now refreshes using explicit request state, and the final suite read the edited owner and revision back from the API. Earlier local SQL evidence and a temporarily interrupted test run are recorded chronologically in the build log.

## D. Documentation

The [native database guide](../database/local-development.md) contains installation requirements, launch commands, environment settings, migrations, test/reset and recovery procedures. Updated README, AGENTS, roadmap and Phase 01 plan record the current authorization and native policy. Schema, security, API, architecture layout, testing strategy and build log describe delivered behavior. Later phase plans retain their milestone and reporting requirements. Historical Phase 00 planning remains available for traceability.

## E. Security and quality review

Loopback and private sockets are the only database transports allowed by the local foundation. Test reset targets a fresh owned cluster; the development inventory is separate. PostgreSQL uses SCRAM authentication locally. Credentials and private data stay outside Git. Synthetic issuer accounts are scoped to the local launcher and assigned server-side memberships. Integration and web tests exercised the restricted runtime identity. Credential-bearing environment variables for the bootstrap and migration owner are excluded from the web subprocess.

The auth adapter has been verified with a local signed issuer. Real Google organization enrollment, MFA policy, hosted networking, managed backup/restore, production cost and scale require separately authorized evidence. Proposed rate limits and retention maintenance in the longer-term design remain release work. No live target availability, incident status, production readiness or SLA is inferred from local tests.

## F. Phase acceptance

| Criterion | Status at handoff |
| --- | --- |
| Working local foundation, inventory, seven private sections and accurate states | Verified locally |
| Native development/test isolation, migrations, grants, upgrade and local restore | Verified locally |
| Required automated checks and phase security controls | Passed locally; no outstanding critical local test failure |
| Current documentation, build log and consolidated report | Available for owner review |
| Hosted CI | Workflow validated locally; a hosted run requires an authorized push/PR and usage allowance |
| Scope boundary | Changes uncommitted on phase-01/foundation. No push, merge, deployment, cloud provisioning, external database connection or live provider checks. Phase 02 has not started. |

**Decision requested at the gate:** owner review of the local Phase 01 foundation. Any repository publication, deployment or subsequent implementation phase requires its own authorization.

## Subsequent publication and acceptance record · 6 November 2026

The prior handoff above is historical. The owner approved publication: commit733af8d1c8edc30154385ef062657af0cc538e49 was pushed on phase-01/foundation. PR#1 merged to main at f9423c06d70ed6655432f3faea47194d5325a209 on5 November. Hosted Engineering quality run41954771693 succeeded. The owner subsequently authorized local Phase02; its baseline audit re-executed all88 Phase01 tests successfully against the identical merged source tree. No deployment approval was inferred.

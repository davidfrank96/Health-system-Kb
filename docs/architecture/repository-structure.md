# Phase 01 repository layout

The [root package](../../package.json) runs one Next.js application, one finite disabled monitoring command and the local test suites.

| Path | Responsibility |
| --- | --- |
| apps/web/app | Server-rendered staff workspace, login/callback/logout, health probes and versioned API |
| apps/web/components | Shared dashboard shell, navigation, inventory list and editor |
| apps/web/lib | OIDC, database-backed sessions, scoped inventory queries and server-side authorization |
| database | Versioned SQL, credential/connection validation, native cluster launcher, migration and owner approval commands |
| jobs/check.mjs | Finite disabled entry point, zero outbound probes |
| tests/unit, tests/integration | Validation, security contract, migration and database verification |
| tests/e2e, tests/support, tests/components | Browser suites, synthetic identity provider, isolated UI fixture and local stack lifecycle |
| .github/workflows/quality.yml | Bounded pull-request checks with an isolated PostgreSQL 18 service |
| docs/reports, harness | Phase outcomes, test evidence, roadmap, decisions and build history |

Repository-local development data and machine credentials stay under ignored .local. Disposable test data is removed by the native launcher. Hosting design remains in [deployment](deployment.md).

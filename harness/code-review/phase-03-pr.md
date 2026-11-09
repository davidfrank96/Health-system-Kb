# Add infrastructure readings, historical charts and confirmed metric imports

Infrastructure Health now displays stored resource measurements for the selected environment. Staff can inspect the source and freshness, compare observed samples, enter a measurement, or preview and confirm CSV. Azure, GCP, Firebase and other providers use the staff entry path. The DigitalOcean adapter is exercised through a controlled transport.

Migration 004 adds resource and metric identities, separate ingestion views, import batches, daily summaries and transactional request budgets. Existing migrations retain their checksums. The collector verifies effective scopes, exact resource, expiry, zero incremental cost and reservations before a bounded HTTPS GET. Web mutations require an authorized role, environment, CSRF and idempotency. Staff assertions do not modify automatic availability evidence.

The local API implements latest readings, raw/daily history, archived series, snapshots, imports and integration capability listing/disable. Documentation covers the migration, scoped grants, source semantics, registration and rollback. See the [acceptance report](../../docs/reports/phase-03-report.md), [desktop evidence](../../docs/reports/evidence/phase-03-desktop.png) and [mobile evidence](../../docs/reports/evidence/phase-03-mobile.png).

Local tests passed: 85 unit/contract/executor, 10 PostgreSQL 18, 18 database-free browser and 48 authenticated browser checks. Fresh migration, upgrade, replay, native dump/restore, retention and finite-job fixture verification completed. Typecheck, lint and optimized build passed.

Live resource identity, credential scopes, zero incremental account costs and actual provider responses await separate owner approval. The 90-day view uses sample-weighted daily observations. Publication and hosted CI remain pending. Owner review precedes merge.

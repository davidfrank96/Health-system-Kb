# ADR 0008 — Phase 02 evidence and local execution boundary

Status: implemented for the authorized local Phase 02; owner acceptance pending. Date:6 November2026. Refines ADR0007 without changing the lean runtime or hosting target.

Daily summaries retain96 single-character scheduled outcomes per endpoint/day, plus method/environment/watermark. This small bounded representation preserves partial-day24h/7d/30d/90d queries after raw pruning. Historical enabled/required intervals determine eligibility. Service reads combine required endpoint codes per instant before summing counts, preventing a healthy endpoint from diluting another required endpoint's failure. No extra service, partitioning or aggregation worker is needed. Raw details still expire; the compact code does not retain response bodies or exact transport details.

Web configuration never supplies outbound approval. A separate offline owner operation records the exact reviewed URL using migration credentials; subsequent URL changes revoke it. This release's default job is unconditionally disabled for live targets. Only the approved disposable test database can obtain the exact loopback fixture capability. Controlled scenarios may simulate several historical scheduled slots while preserving actual execution timestamps, and are explicitly labeled synthetic. A future live scheduling adapter needs new authorization, stable invocation-slot metadata, provider timeout/billing evidence and current exact target approvals.

Basic offline-approved future maintenance intervals support sample exclusion and health presentation. Operator incident narratives, retrospective corrections and maintenance-management UI remain Phase 04. No API can fetch arbitrary URLs or trigger a probe.

Consequences: no live production assurance is claimed; test evidence remains reproducible without Docker/cloud. Configuration history and compact samples add a little bounded storage but prevent misleading retrospective percentages. Rollback preserves monitoring tables rather than supplying a destructive down migration.

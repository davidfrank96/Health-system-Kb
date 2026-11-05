# Lean Phase 00 review

31 October 2026. Reviewed revised user brief, prior packet and current documentation/contracts. No application code exists. This is architecture review, not a runtime vulnerability scan.

Independent offline threat-model review confirmed lean-specific boundaries: actual direct job executor controls DNS/TLS/redirects; manual inputs need provenance and resource/env authorization; QA signatures are conditional and scoped; authentication alone does not make ingress network-private; job runtime/overlap/cost limits cannot be replaced by provider budget alerts; local isolation does not require a permanent remote stack. These were incorporated into current designs.

Self-review removed active public schemas/routes, queue/outbox/report-service dependencies, old monitoring placeholders, high-scale tests and obsolete recovery/cost guarantees. Count-based sampled availability avoids pretending quarter-hour checks observe every second. The simple advisory lock uses a dedicated connection and abort-on-loss; duplicate/late slots skip rather than replay. CSV preview/commit is atomic with honest manual source timestamps. Unknown provider prices/shared allowance headroom disable requests.

Residual decisions are in L01–L13: actual target list/IdP, account job billing/minimum/runtime behavior, <=€50 spending approval, provider scope/free allowance, modest workload, QA sender, retention/recovery and conditional temporary tests. Budget control limitations are explicit. No deployment or Phase 01 acceptance inferred from the owner selecting lean direction.

[Validation](../../docs/testing/phase-00-validation.md) covers document and schema mechanics/history. Archived documents and superseded ADR bodies intentionally contain old text, clearly marked historical; active roadmap/contracts/layout do not require it.

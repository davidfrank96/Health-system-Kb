# ADR 0007: Lean internal MVP and cost-gated collection

Date: 31 October 2026. **Owner-selected direction; implementation, account costs and deployment approval pending.** Supersedes conflicting MVP decisions in ADRs 0001–0006; their historical rationale is retained unchanged below their status notice and in the v1 archive.

## Context and decision

The earlier hosting proposal exceeds the intended ~€50 monthly starting target. Use one internal Next.js service, smallest practical single-node managed PostgreSQL and a finite 15-minute scheduled job. Local development/testing is primary; temporary remote test resources need specific budget/lifetime approval. Direct safe HTTPS checks provide sampled status/history. Use DO monitoring first only after permission/no-incremental-cost evidence; other uncertain sources stay disabled with manual snapshots/CSV fallback. Existing QA ingestion is synchronous and no-charge. Reports query stored data inside the app. No runtime AI or paid third-party API features.

## Alternatives and tradeoffs

Retaining the prior worker/monitoring/HA stack improves latency/diagnostics/resilience but fails the current scope/budget. Putting everything on a Droplet conflicts with the chosen managed app/database direction and adds VM operation. Treating all read-only cloud API calls as free risks charges; disabling uncertain automation is preferable while still delivering HTTPS availability/manual evidence. Running a hidden web-process timer couples scheduling to restarts and avoids neither resource consumption nor duplicate execution, so use the explicit finite job.

15-minute sampling misses short outages and two-slot confirmation can take ~15–30m. One web/DB/provider is not HA or independent self-monitoring. Cost alerts/application limits are not provider billing caps. Managed recovery and local/temporary tests retain security/reliability work without permanent staging/archives. Manual readings are staff assertions with source/time/actor, not authenticated provider data.

## Consequences and gates

Simplify layout/schema/API and remove public projections, distributed job queues/outboxes, series/partition assumptions and public performance targets. Keep auth/MFA/RBAC, TLS, SSRF actual-executor defenses, provenance, retention/audit and real tests. Confirm exact job size/rate/minimum/timeout/retry behavior, account currency/tax, workload, provider headroom and actual spending limit before Phase 01 approval; enablement/deployment remains separately authorized. [Cost model](../deployment/cost-estimate.md), [approval register](../../harness/context/decisions-and-open-questions.md), [change summary](../architecture/change-summary.md).

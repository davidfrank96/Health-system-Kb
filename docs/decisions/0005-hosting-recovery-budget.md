> **Superseded for the lean MVP by [ADR 0007](0007-lean-internal-mvp.md).** The text below records the earlier proposal only; it is not active scope, approval, deployment or acceptance guidance. Original bytes are preserved in docs/archive/phase-00-v1.

# ADR 0005: Hosting availability and recovery tradeoffs

Status: **proposed**, 31 October 2026. Approval dependencies: Q05/Q06/Q07/Q16. No approval recorded.

## Context

New database edition eligibility affects HA price; public/monitoring components retain same-provider risk.

## Decision proposal

Budget new production Advanced primary+standby, separate staging, one monitoring host and independent second-region check. Propose recovery targets subject to rehearsal.

## Alternatives and tradeoffs

Single-node production lowers budget but requires accepted recovery/availability risk. Historical Standard HA pricing cannot be assumed for a future new cluster.

## Consequences and validation

Obtain regional/account quote and backup/restore evidence. VPC plus dedicated egress IP feature is unsupported; fixed-egress requirements reopen placement design.

See [approval register](../../harness/context/decisions-and-open-questions.md) and [research evidence](../architecture/research.md). Revisit if workload, provider capability, cost or security assumptions change.

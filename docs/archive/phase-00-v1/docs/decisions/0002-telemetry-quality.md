# ADR 0002: Separate service health from observation quality

Status: **proposed**, 31 October 2026. Approval dependencies: Q04/Q11/Q15. No approval recorded.

## Context

Missing collection cannot prove outage or success, and provider latency varies.

## Decision proposal

Store condition and quality separately; time-weighted coverage/availability includes unknown duration, null denominators and maintenance policy.

## Alternatives and tradeoffs

Treat missing as healthy hides outages; treat missing as down invents outages. Sample-count uptime biases irregular collection.

## Consequences and validation

UI/API show source timestamps and coverage. Kuma sampling/recency must be demonstrated before publishable history; unknown remains explicit.

See [approval register](../../harness/context/decisions-and-open-questions.md) and [research evidence](../architecture/research.md). Revisit if workload, provider capability, cost or security assumptions change.

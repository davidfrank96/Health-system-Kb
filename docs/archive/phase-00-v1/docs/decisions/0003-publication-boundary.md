# ADR 0003: Explicit public publication boundary

Status: **proposed**, 31 October 2026. Approval dependencies: Q04/Q13/Q16. No approval recorded.

## Context

Internal incidents and provider labels contain confidential details; Operators can edit internal incidents without publication authority.

## Decision proposal

Separate publisher grant, sanitized immutable revisions, digest-bound approval, narrow public schema/reader and audit.

## Alternatives and tradeoffs

Filtering arbitrary internal DTO fields is fragile. Automatic publication of every incident violates approval and privacy requirements. Separate public hosting improves resilience but adds cost and remains a later decision.

## Consequences and validation

Private edits do not change published text. Retractions are audited and cannot recall delivered messages. Shared process is a residual compromise boundary.

See [approval register](../../harness/context/decisions-and-open-questions.md) and [research evidence](../architecture/research.md). Revisit if workload, provider capability, cost or security assumptions change.

# ADR 0006: Supported monitoring interface and sampled history

Status: **proposed**, 31 October 2026. Approval dependencies: Q11. No approval recorded.

## Context

Kuma metrics are documented, but an administrative API and exact event/heartbeat export are not established by this research.

## Decision proposal

Use metrics-only ingestion, manual approved monitor configuration and sampled-duration history with explicit source-recency gate.

## Alternatives and tradeoffs

Internal Socket.IO/API clients are brittle and prohibited by baseline. Scrape timestamps alone cannot prove ongoing probes. Rebuilding a custom availability engine conflicts with low-maintenance scope.

## Consequences and validation

Phase 03 must run a controlled version-pinned spike. If probe freshness cannot be established, display unknown and propose a supported additional recency signal/exporter for review before publishing uptime.

See [approval register](../../harness/context/decisions-and-open-questions.md) and [research evidence](../architecture/research.md). Revisit if workload, provider capability, cost or security assumptions change.

# ADR 0001: Modular monolith and persistent worker

Status: **proposed**, 31 October 2026. Approval dependencies: Q05/Q15/Q17. No approval recorded.

## Context

The platform needs staff/public interfaces and periodic provider collection without multiplying operational services.

## Decision proposal

Use Next.js modular web/API plus one separately deployed worker; PostgreSQL is durable coordination/storage.

## Alternatives and tradeoffs

Single all-in-one Droplet reduces cost but couples failures. Microservices/Redis/Kafka add coordination and cost without demonstrated scale.

## Consequences and validation

Deploy worker separately; keep package boundaries and lease/idempotency tests. No claim of full high availability.

See [approval register](../../harness/context/decisions-and-open-questions.md) and [research evidence](../architecture/research.md). Revisit if workload, provider capability, cost or security assumptions change.

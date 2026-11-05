# ADR 0004: Provider read permissions and query exceptions

Status: **proposed**, 31 October 2026. Approval dependencies: Q08/Q09. No approval recorded.

## Context

Provider reader roles can be broader than expected; a BigQuery read query creates a billed job.

## Decision proposal

Review effective role dependencies per provider/environment; allow only documented approved operations. Defer Crashlytics unless query-job budget/permission and source-location interpretation are explicitly approved.

## Alternatives and tradeoffs

Firebase Admin credentials and broad Contributor roles are rejected. Treating every HTTP POST as a write or every GET as harmless is inaccurate.

## Consequences and validation

Application resource allowlists supplement, not replace, provider IAM. No permission changes or exports are enabled by discovery.

See [approval register](../../harness/context/decisions-and-open-questions.md) and [research evidence](../architecture/research.md). Revisit if workload, provider capability, cost or security assumptions change.

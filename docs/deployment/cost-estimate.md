# Lean monthly cost and approval gate

Reviewed 31 October 2026. Target **approximately €50/month or less including small operational charges**; actual hard spending limit is still to be agreed. USD list prices do not establish the final euro bill. No spending/provisioning is authorized.

| Component | Monthly USD planning amount | Basis |
| --- | ---: | --- |
| One 1 GiB web instance | $12 | `apps-s-1vcpu-1gb`; smallest selected starting plan, one instance |
| Single-node Managed PostgreSQL 1 GiB | $15 | Small managed plan; no standby |
| **Fixed base** | **$27** | Hosting/database, not an API bill |
| 15-minute finite job | $5 reserved allowance | Runtime model below; 1 GiB candidate must be eligible |
| Small variable/temporary-test reserve | $3 | Allowance, not a quoted service or permission to spend |
| **Initial planning envelope** | **$35 before tax/FX** | No separate staging, archives, monitoring hosts or paid APIs |

Sources: [App Platform pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/) and [PostgreSQL pricing](https://docs.digitalocean.com/products/databases/postgresql/details/pricing/). The published fixed 1 GiB $10 app option may save $2 if suitable; start from the user-selected $12 proposal and confirm eligibility. A 2 GiB web plan at $25 makes fixed base $40 and the same allowances $48 before tax/FX, so upgrade requires renewed budget approval.

## Scheduled runtime calculation

[Scheduled jobs](https://docs.digitalocean.com/products/app-platform/how-to/manage-jobs/) are billed only while running. Pricing describes per-second proration and a one-minute minimum for apps. For conservative planning use 31 days × 96 starts/day = **2,976 runs**; billed duration includes startup, retries, cleanup and applicable minimums. Approximate hourly rate for a $12/month size using a 28-day billing denominator is $12/672 = $0.017857/h; this is a model, not an account quote.

| Mean billable duration/run | Monthly runtime | Modeled compute |
| --- | ---: | ---: |
| 60s | 49.6h | $0.89 |
| 120s | 99.2h | $1.77 |
| 300s | 248h | $4.43 |

Formula: starts × max(actual billable seconds, applicable minimum) × confirmed per-second price, plus any per-start minimum. The general pricing page's $0.01 minimum for short-lived app creation is not proven here to be a per-job-invocation fee. **Confirm job SKU, proration, startup billing, retry behavior and minimum charge in the account before deployment.** As a stress scenario, $0.01 charged per start would be $29.76/month for the job alone, invalidating the $5 allowance. Do not silently assume that ambiguity away. No live experiment or resource creation was performed.

## Euro sensitivity and variable exposure

Use `EUR total = USD subtotal × account EUR-per-USD rate × (1 + applicable tax fraction) + separately billed fees`. Illustrative stress assumptions, not current exchange/tax quotes: €1.10/USD and 23% tax yield $35 × 1.10 × 1.23 = **€47.36**. The $48 upgrade scenario becomes **€64.94** under the same assumptions. Actual billing currency, tax treatment and exchange spread are unknown; replace assumptions with account evidence. Do not infer tax residence from the user's timezone.

Confirm team-wide bandwidth use/overage, database storage, build/CI allowance, new/existing domain costs, temporary staging and restore-cluster hours, and existing-provider execution/egress from probes. None is automatically free. Temporary restore/staging must fit remaining allowance or receive a separate approved budget; if it cannot, postpone the test/deployment, not secretly weaken verification. No additional paid provider API features are included.

## Controls and their limits

Single instance/no autoscaling; 96 scheduled slots/day; max five-minute run; 20 targets/four concurrency/two attempts; bounded responses and provider queries; no automatic retries/backfill storms. Keep integrations disabled unless price/permission/shared usage is proven and current. Pause optional requests before exceeding a conservative approved local usage allowance; show monitoring gaps explicitly. Paid plan changes, new services and higher frequency require approval.

Propose review/notification thresholds at 70/85/95% of the owner-approved limit through existing no-charge account mechanisms or manual checks. **Alerts, application counters and a timeout are not hard provider billing caps.** Delayed billing, shared-account consumers, crash loops, service base charges and account limitations can still overrun. The owner must agree a spending limit plus stop procedure and accept residual risk; no guaranteed €50 ceiling is claimed. If strict account-wide enforcement is required but unavailable, do not deploy on the assumption it exists.

Deployment gate: account quote/rate/minimum proof; measured local job runtime/startup estimate and approved workload; zero-incremental-cost integration ledger; confirmed FX/tax/fees; budget ceiling and stop owner; separately authorized restore/staging test costs. See [approval register](../../harness/context/decisions-and-open-questions.md).

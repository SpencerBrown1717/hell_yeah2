# OS learning system: executable design and release contract

Revision: 2026-10-19 UTC. Implementation: `src/os/`, D1 migrations, `web/js/os-*`. This extends the four PRDs and supersedes the first-increment statement that no statistical learner is implemented. The learner now updates a shadow quality model; it does not fit a certified financial response model.

## Two learning scopes

Every signed-in visitor has a server-derived private pilot workspace (`org_` plus a digest of the trusted Sites identity). A browser cannot choose its organization. A service credential can target a validated workspace for normalized ingestion. The production joint build must replace this personal-workspace resolver with Hellyeah organization membership and role checks; it must not infer team membership from matching email domains. The existing per-organization Wallet remains the financial authority.

Personal learning combines mature outcomes, recency, the customer's unresolved feedback, explicit growth preferences and recorded overrides. Feedback belongs to the originating workspace. Negative lead-quality, brand, budget or inventory feedback blocks expansion until it is resolved with an explanation. A product action expresses intent; it is never converted into revenue, a conversion, or a positive treatment effect.

Aggregate learning is an optional prior. A contributor must opt in and have at least twenty mature eligible outcomes in the matching cohort. Each workspace contributes at most one hundred normalized pseudo-observations, regardless of its size. A recipient is excluded from its own aggregate. At least five other distinct workspaces must remain. Counts are rounded to multiples of five, source mode and cohort must match, and stale contributions expire. The current cohort is explicitly `Search:USD:lead_quality:v1`; it does not mix campaign channels, currencies or qualification definitions.

The released object contains counts and cohort metadata, never feedback text, campaign IDs or workspace identifiers. This is bounded aggregation with a minimum group size, **not differential privacy** and not protection against coordinated identities or repeated-query differencing. Before production, replace the pilot release path with versioned cohort snapshots, consent governance, sensitivity accounting, a privacy budget and a reviewed minimum cohort policy. Historical decision snapshots retain the aggregate available at the time; withdrawing consent removes the contribution from future cohort calculations, not from immutable past evidence.

## Personal estimator

Let a mature outcome window contain `n_i` eligible outcomes and `q_i` qualified outcomes. Its weight is `w_i = 2^(-age_days / 30)`. Windows older than ninety days, immature windows, superseded corrections and future-dated windows do not enter the model. Define weighted eligible count `N = sum(w_i n_i)` and qualified count `Q = sum(w_i q_i)`.

A cold start uses a weak Beta(1, 1) prior. If an eligible cohort is available, its mean supplies a prior with strength twenty, clipped to a mean between 0.05 and 0.95. The update is `alpha = prior_mean * prior_strength + Q`, `beta = (1-prior_mean) * prior_strength + N-Q`. The model reports posterior mean, an approximate 95% normal interval clipped to [0,1], recency-weighted count, effective sample size and the relative weight of personal evidence `N/(N+prior_strength)`.

These are model-based quality diagnostics. They assume a comparable definition of qualification and approximately independent Bernoulli outcomes; correlated conversions and changing outcome definitions violate the assumptions. Recency weighting is a practical forgetting rule, not proof of Bayesian generative correctness. The interval is explicitly approximate. Before using quality estimates in a financial model, evaluate clustered uncertainty, definition stability, calibration and source reconciliation on temporal holdouts.

The current model can **veto** an expansion if the upper qualification-rate interval is below 35% with sufficient evidence. It also detects a recent fourteen-day qualification rate below 70% of the prior rate, requiring at least fifty eligible outcomes in both periods. Those thresholds are versioned pilot hypotheses, not universal customer standards. A production policy should use customer-specific qualification economics and evaluate false-positive/negative costs. A quality improvement cannot create a higher financial forecast or bypass a missing marginal-return certificate.

## Financial decision kernel

Evaluate customer contribution after media and platform fees. Integer micros represent money; rate products use integer basis points and BigInt intermediate multiplication. Unknown margin produces unknown contribution and ROI, never an invented zero-margin forecast. Missing, stale or immature measurement holds spend. Average attributed ROAS cannot certify marginal return.

The finite action set is hold, +5%, +10%, +15% or +20% of current media budget. Each positive option must pass source freshness, conversion maturity, verified tracking, positive contribution, customer ROI floor, synthetic marginal-evidence validation, feedback, quality, channel, cash, Wallet, inventory, reinvestment and maximum-step gates. Cash and Wallet bounds include platform fees. Choose the eligible option with the largest conservative incremental customer contribution, breaking ties toward less spend. Hold is always available. The current financial evidence is synthetic and the production adapter fails closed until separately certified.

Every decision records its complete input snapshot, input hash, rejected alternatives, gate results, source version, policy version and validity bound. Expiry is bounded by the earliest of decision lifetime, source freshness and marginal certificate expiry. A customer may accept only the latest unexpired exact decision under the current policy. Acceptance creates one review draft and moves zero funds. An unresolved draft blocks another expansion. Decline suppresses further growth prompts for seven days unless the customer explicitly saves a new growth policy.

## Improvement benchmark

The 2–5× request is an aspiration with an executable 2× lower-bound gate, not a promised outcome. Compare a challenger with a baseline on matched independent evaluation units, using contribution after acquisition as the primary metric. The supplied evaluator reports observed factor, paired difference, a deterministic 1,000-resample bootstrap interval, lower factor bound and guardrail violations. At least thirty units, positive baseline, a positive lower difference bound, a lower factor bound of at least two and zero guardrail violations are required for the synthetic target flag.

The built-in dataset intentionally yields **1.25×**, so the target fails. It tests honest rejection; it is not a measurement of this product. Even a synthetic 3× case remains shadow-only. Zero or negative baselines make a ratio undefined and never produce an infinite performance claim. Repeated significance peeking, correlated units, selective inclusion and hindsight replay can invalidate the inference; production requires a registered prospective randomized design, fixed analysis windows, attrition accounting, customer-level clustering and multiplicity control. No code automatically promotes a financial policy.

## Continuous update mechanics

A valid new feedback event, outcome batch, resolution, policy update or sample selection runs the four-step Mastra workflow: validate context → synthesize feedback → update personal/cohort evidence → evaluate customer economics. The resulting event, decision, workspace revision, cohort contribution and operation response commit atomically in D1. Compare-and-swap retries handle concurrent requests. A stable operation key returns the original compact receipt and current workspace state; a conflicting payload is rejected. The receipt preserves the committed revision and decision ID. A unique commit token fences all dependent writes to the successful revision, preventing a losing concurrent request from changing aggregate contributions. Source-event identity prevents the same survey or outcome from accumulating extra weight under new operation keys.

The browser captures explicit product actions in a persisted, workspace-scoped outbox, retries on reconnection and removes only acknowledged records. It resolves server identity before flushing and sends an expected-workspace precondition with every command. Account changes clear stale views and cannot redirect an old queue into a new account. The legacy v1 unscoped queue is retained locally but never automatically uploaded because its owner cannot be established. Missing stable identity returns a top-level Sites sign-in recovery action; email is not substituted as a user ID. While the OS or Learning lab is visible, it checks for new cohort evidence every sixty seconds and evaluates when the aggregate changes, the decision expires or the model is at least one hour old. It does not claim to run unattended while the app is closed. Trusted service ingestion still evaluates the affected workspace without an open browser. Cross-workspace scheduled refresh, live source polling and durable leased jobs remain the next infrastructure slice. Normalized fixture source corrections already replace active learning facts; the live adapter must preserve that behavior.

Mastra's intermediate workflow checkpoints currently use process memory. Final inputs, outputs, feedback and audit records use D1. This supports bounded synchronous requests, not resumable multi-hour agents. A restart during evaluation causes the same idempotent request to be retried; nothing is financially executed. Worker leases and command replay are now implemented around these short evaluations. Bind durable Mastra step storage before suspended, long-running or externally mutating workflows.

## Scope and operational limits

The private pilot allows five hundred feedback records, five hundred outcome windows, one hundred source-report windows, one hundred research snapshots, fifty recent decisions and a 1.5 MB workspace envelope. Audit and operation records retain original events and decision snapshots. These are explicit limits, not a design for millions of ad dollars. Production requires normalized fact tables, partitioned analytical storage, retention/deletion policies, source-derived correction semantics, data lineage, durable ingestion watermarks, observability, rate limits, org RBAC and cost budgets.

The deployed UI can collect actual customer feedback now. Its financial facts, outcome sample generator and replay are visibly synthetic. Simulator, Creative and Experimentation drafts remain local fixtures. Each can submit a versioned immutable snapshot to the durable OS research inbox; exact research reviews grant no spend authority. Selected product-action signals are captured without treating synthetic results as measured outcomes. Trusted ingestion displaces sample learning history, and further sample loading is blocked to prevent evidence contamination. The isolated mock campaign remains available. This distinction is part of the product contract.

## Implementation map

| Capability | Source | Evidence |
| --- | --- | --- |
| ROI and bounded decision policy | `src/os/policy.mjs`, `contracts.mjs` | Kernel negative-path and monotonic-limit tests |
| Personal and aggregate learning | `src/os/learning.mjs` | Cold-start, adaptation, drift, isolation and consent tests |
| Typed orchestration | `src/os/workflow.mjs` | Real Mastra fixture execution |
| Durable transaction and audit | `src/os/repository.mjs`, `db/schema.ts` | SQLite transaction, duplicate and concurrent-request tests |
| Identity, API, ingestion | `src/os/http.mjs`, `app/api/os/[[...path]]/route.ts` | Auth, origin, authority and tenant tests |
| Feedback collection and outbox | `web/js/os-controller.mjs`, `os-client.mjs` | Retry and acknowledgement-failure tests |
| Cross-product research review | `src/os/proposals.mjs`, `web/js/product-proposals.mjs` | Immutable revision, stale review, authority and three-product UI journeys |
| Source correction and campaign rehearsal | `src/os/adapters/`, `mock-campaign-trial.mjs` | Real Mastra + SQLite full campaign, zero outcomes, correction and concurrency |
| Operator and learning interface | `web/js/os-views.mjs` | DOM → HTTP → SQLite journeys |

## Next implementation order

1. Bind source-owned organization membership, Brand/Studio snapshots, deduplicated X-Ray outcomes, CRM qualification, margins and refunds. Reconcile against source dashboards before enabling monetary estimates.
2. Add normalized fact/event tables, correction versions and outcome maturity watermarks. Separate business facts from customer feedback and experimental assignments.
3. The durable queue, source cursors and leased evaluation workers now pass crash/retry tests. Bind persistent Mastra step checkpoints and production source transport next; see [background operations](background-operations.md).
4. Replace synthetic marginal bounds with independently validated response-model artifacts, then evaluate drift, coverage and uncertainty calibration on time-separated holdouts.
5. Run a preregistered policy experiment with a fixed incumbent and contribution objective. Keep a holdout, customer constraints and precise rollback triggers.
6. Only then connect an approved plan to the existing Hellyeah reservation/review/managed-launch flow. Preserve exact approval, source state reconciliation and one-time reservation.

See [integration readiness](integration-readiness.md) for exact module status, source authority mapping and production acceptance gates.

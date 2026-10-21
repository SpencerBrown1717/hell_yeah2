# Integration readiness and module ownership

Revision: 2026-10-19 UTC. This is the implementation map for the four PRDs. It distinguishes working fixture-backed product behavior from the production work that needs Hellyeah source access or new infrastructure. The PRDs describe the target product; they are not a claim that every production requirement is implemented.

## What works together now

| Product | Implemented behavior | Durable boundary | Remaining production work |
| --- | --- | --- | --- |
| Autonomous Growth OS | Real Mastra workflow, customer feedback, bounded contribution/ROI policy, per-customer qualification model, opt-in cohort prior, drift veto, review responses, source corrections and replay gate | D1 workspace, command receipts, immutable decision evidence, audit, leased jobs and ingestion cursors | Hellyeah organization roles, real metrics/margins, live report-reader transport, durable Mastra step checkpoints, certified financial policy |
| Campaign Simulator | Seeded assumption-based Search scenarios, explicit unsupported-scope planning, saved snapshots, exact-plan demo review and OS research submission | Submitted research snapshots are in D1; draft scenarios remain browser-local | Calibrated response models, parameter uncertainty, auction/saturation effects, temporal validation and source-derived scenario inputs |
| Creative Intelligence | Studio-linked fixture assets, observed copy/angles, labeled sample capture records, creative-to-test handoff and OS evidence submission | Submitted creative snapshots are in D1; local draft records remain browser-local | Isolated live browser capture, object storage, OCR/vision extraction, provenance, rights/retention and field evaluation |
| Experimentation | Registered fixture designs, deterministic reference assignment, descriptive sample results, draft/running/paused lifecycle and OS research submission | Submitted test designs and research reviews are in D1 | Durable visitor assignment/exposure/outcome tables, real serving integration, maturity, sample-ratio checks, source-certified assignment evidence and policy holdouts; the OS now evaluates registered bounded trial reports |

The OS inbox accepts all three product types through a strict discriminated schema. Each payload preserves its external artifact ID and becomes a content-addressed immutable snapshot with an organization-scoped ID. Identical submissions deduplicate across operation keys. Changed content creates a new revision linked to the previous snapshot. A stale snapshot cannot be accepted once a successor exists. A research acceptance never grants a campaign launch or Wallet permission, changes financial facts or certifies an uncalibrated forecast.

The isolated campaign rehearsal connects the creative hypothesis, planning forecast and experiment design to an exact fixture approval, source-owned reservation, review/Serving transition, outcomes and two real Mastra evaluations. Healthy synthetic economics produce a $2,000 maximum increase; a source correction with poor economics/quality produces $0. The correction replaces the active learning fact for that account window. Launch retries reserve once. The rehearsal creates no Google API call and changes no customer economic evidence.

## Preserve the existing Hellyeah flow

| Existing authority | Extension point | Code or contract | Source-binding acceptance evidence |
| --- | --- | --- | --- |
| Organization and membership | Resolve actor, organization and capability manifest before any workspace access | `GrowthIdentityPort` in `contracts/os-ports.ts`; `src/os/http.mjs` is the personal pilot adapter | Two members see their own authorized organization; cross-organization and revoked-role requests fail |
| Brand Profile and Studio | Read versioned reviewed assets; preserve snapshots through proposals and plans | `contracts/ports.ts`, `src/domain.mjs`, `src/os/proposals.mjs` | Changed Brand/creative versions invalidate old exact plans |
| Campaign Agent and X-Ray | Read readiness and attributed measurement; preserve tracker and maturity gates | `src/domain.mjs`, `src/os/policy.mjs` | Missing tracking, immature conversions or stale source facts hold spend |
| Managed Google account | Normalize account-wide, non-overlapping outcome windows and source revisions | `GrowthOutcomePort`, `src/os/adapters/report-contract.mjs` | Reconcile spend/revenue/qualified outcomes against source; replay, correction and overlap tests pass |
| Existing customer approval | Prepare a draft tied to decision ID, input hash and policy version | `GrowthExecutionPort`, `src/os/kernel.mjs` | Stale, expired or superseded decisions cannot create a new approved handoff |
| Existing prepaid Wallet | Preserve source-owned reserve, settle and refund behavior | Original fixture adapter and `src/os/adapters/mock-google.mjs` | Retry, timeout and reconciliation reserve exactly once; no pending refund becomes spendable |
| Existing review and managed launch | Retain source lifecycle, managed account, read-only priced Search plan and PMax final candidates | `src/domain.mjs`, `docs/compatibility-matrix.md` | Staging parity for rejected, in-review and Serving paths, including partial failures |

These ports are proposed internal integration interfaces. They are not public endpoints documented by Hellyeah. The legacy account-economics normalized report explicitly permits only `fixture_hellyeah_google`, USD/Search and fixture managed accounts. Renaming an environment variable or changing a source-mode string is insufficient to certify a live adapter.

## Continuous trial learning and Wallet extension

See [continuous-learning.md](continuous-learning.md) for the executable reporting contracts, prospective personal inference, opt-in strategy priors, reviewed draft port, experience feedback and voluntary funding flow. The new trial-report contract supports separately partitioned live/fixture contexts; no live producer is bound. It does not relax the legacy fixture-only financial report. Source-only ingestion, corrected reports, consent withdrawal, trial maturity and exact draft handoff are covered by the regression suite.

Stripe is deliberately unbound. The UI saves confirmed unpaid funding requests with a null checkout URL; a server-side port can create a checkout through the existing Hellyeah Wallet. This OS never credits funds from a checkout redirect. The authoritative Wallet owns payment reconciliation and money movement.

## Module boundaries

- `src/os/contracts.mjs`: stable validation, integer money and canonical hashing.
- `src/os/feedback.mjs`: source-deduplicated qualitative feedback and material concerns.
- `src/os/learning.mjs`: bounded customer and aggregate quality estimates; benchmark rejection.
- `src/os/policy.mjs`: deterministic financial action scoring and customer constraints.
- `src/os/proposals.mjs`: immutable cross-product research snapshots and exact review.
- `src/os/adapters/`: normalized source reports and the isolated mock Google/Hellyeah source.
- `src/os/kernel.mjs`: typed command reducer and lifecycle state transitions.
- `src/os/workflow.mjs`: Mastra sequencing of evidence synthesis, learning and policy.
- `src/os/repository.mjs`: atomic storage, revision fencing, compact receipts and cohort queries.
- `src/os/job-contracts.mjs`, `job-repository.mjs`, `job-worker.mjs`, `jobs-http.mjs`: durable ingestion, received/applied cursors, ordered leases, retries and bounded background processing.
- `src/os/http.mjs`, `http-boundary.mjs` and `transport.mjs`: identity, authority, origin, streaming body limits and response errors.
- `web/js/product-proposals.mjs`, `os-client.mjs`, `os-controller.mjs`, `os-views.mjs`: browser adapters, feedback outbox and operator interaction.

No language model owns money arithmetic, authorization, experimental validity or Wallet state. The orchestration is executable Mastra; no external model account is required to reproduce the current fixtures.

## Data integrity rules already enforced

1. Stable organization/operation keys reject conflicting payloads. Retries return the immutable original receipt with the latest workspace state; clients never move their displayed revision backward within an account. Account switches replace the view, while stale in-flight reloads are discarded. Browser commands carry an expected-workspace precondition, and feedback queues are scoped to the server-resolved workspace.
2. Compare-and-swap writes use a unique commit token. Audit, receipt and cohort changes are fenced to the exact successful transaction, including concurrent duplicate requests.
3. Source windows are account-wide, non-overlapping and versioned. Corrections supersede the previous active learning observation; source arrival time cannot make old business facts fresh.
4. A zero-outcome report can still update spend and revenue. It creates no positive quality evidence and cannot bypass conversion maturity.
5. Trusted ingestion removes demonstration history. Loading sample outcomes after ingestion and replacing source-owned financial facts with sample economics are rejected; use the isolated mock campaign instead.
6. Feedback and research are never silently converted into conversions, revenue or validated treatment effects. Negative customer constraints can veto expansion.
7. Aggregate queries exclude the current workspace, require consent and five other contributors, expire stale contributions and bound prior weight. This is thresholded aggregation, not differential privacy.
8. Visible workspaces poll every minute. Source changes and feedback immediately evaluate; expiry, hourly model age and changed cohort evidence also request reevaluation. The durable worker separately processes accepted jobs while closed and schedules model refreshes for enrolled workspaces; see [background-operations.md](background-operations.md) for access, cadence and limits.

## Reproduce and continue

```bash
corepack pnpm install --frozen-lockfile
npm run quality
npm run demo:campaign
npm run build
```

The quality command runs scoped application lint, TypeScript, PRD/contrast validation, all tests and all Mastra rehearsals. `.github/workflows/quality.yml` prepares the same checks for GitHub. That remote workflow has not run while GitHub account setup is blocked.

After completing GitHub authentication as `SpencerBrown1717`, `bash scripts/push-github.sh` creates or reuses a private `hell_yeah2`, verifies the account and destination, preserves the existing `origin`, and pushes without force. It requires a clean committed tree. It does not bypass GitHub two-factor authentication.

## Production sequence with concrete acceptance gates

First bind identity and read-only source facts, then reconcile historical reports and corrections with source dashboards. The transactional job queue and source cursors now recover interrupted batches; next normalize evidence out of the bounded workspace document, bind real source pagination and verify staging restart/retry recovery. Implement isolated capture and durable assignment/exposure storage as separate services. Fit and validate financial response models on temporal holdouts. Register a prospective policy experiment before making an improvement claim. Only after those gates connect exact customer-approved drafts to the existing source reservation/review path.

The current pilot caps 500 feedback records, 500 outcome observations, 100 report windows, 100 research snapshots, 50 recent decisions and a 1.5 MB workspace response. These deliberate bounds make failure explicit; the current document-oriented state is not the production architecture for millions in spend. Keep immutable audit records when normalizing storage, and benchmark real throughput/retention before raising limits.

Incomplete browser identity produces HTTP 401 and a normal top-level Sites sign-in link. Email-only requests cannot read or write user-owned records. The legacy unscoped feedback queue remains untouched locally and is never silently assigned to a new account.

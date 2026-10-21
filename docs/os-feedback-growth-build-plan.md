# OS increment 1: feedback, customer economics and responsible expansion

Status: approved for implementation by the user's October 18 instruction. This plan is a concrete extension of the four PRDs. The existing visual experience stays in place while an authenticated, persistent service is added beneath the Growth OS.

## Product objective and incentive design

The primary objective is customer contribution after advertising and platform fees, subject to customer constraints. The secondary objective is retained, productive advertising spend on Hellyeah. A reservation, top-up, recommendation acceptance or larger budget does not count as a customer outcome. Revenue retention and spend expansion are business metrics, never permission to lower the customer's return threshold.

Customers should want to invest more because they can see verified value, remaining capacity, a credible marginal return, and a bounded next experiment. The product surfaces an opportunity card, a plain-language rationale, a customer-selected reinvestment fraction and a maximum incremental budget. There is no forced top-up, hidden default increase, expiring offer, fabricated scarcity or reward for spending through poor returns. Explicitly choosing to maintain budget remains available.

## Operational learning loop

1. Collect structured customer feedback, observed product actions and source outcome batches.
2. Validate the authenticated actor, source identity, organization, event time, schema, size and idempotency key.
3. Persist the original event and its provenance. Duplicates do not increase evidence weight.
4. Link feedback to its campaign, creative, recommendation or experience context; retain unspecified scope rather than invent a join.
5. Recompute feedback themes and operational blockers. Self-reported quality is a preference/quality signal, not a measured revenue effect.
6. Evaluate customer economics and eligible budget candidates under immutable policy and evidence versions.
7. Persist a decision, its reasons, rejected alternatives and input fingerprint. Present an exact bounded recommendation or a clear hold/repair action.
8. Capture accept/decline/reason and follow-up outcome separately. A decline updates intent, not the conversion dataset.
9. Re-evaluate on new feedback, policy updates and accepted outcome batches. Re-evaluation creates a new version; prior decisions remain auditable.
10. Promote a learned policy only after registered temporal holdouts and prospective outcome evidence. The implemented shadow quality model is described in `os-learning-design.md`; it cannot promote a financial policy.

## Inputs and authority

| Input | Initial implementation | Joint-build substitution |
| --- | --- | --- |
| Customer feedback | Authenticated form with category, polarity, severity, optional campaign and text | Existing product feedback, account review and consented support connectors |
| Product actions | Queued, idempotent events on explicit approval/dismiss/pause and experiment actions | Existing Dashboard/CLI event stream |
| Economics | Named, versioned synthetic source fixtures with realistic metric definitions | Deduplicated X-Ray value, CRM qualification, returns, margin and source spend |
| Forecast evidence | Named synthetic scenarios demonstrating valid/invalid gates | Validated model-registry result with a source-owned certification record |
| Growth policy | Server-stored customer ROI floor, monthly ceiling, maximum step and reinvestment fraction | Existing organization policy and approved delegation |
| Ad execution | Review-only proposal; live writes fail closed | Existing Campaign/Wallet/Review ports and managed account path |

Free text is data, never a tool instruction. All displayed feedback is escaped. Text is limited to 2,000 characters. Feedback cannot grant approvals, change margin facts or certify a forecast. Imports accept at most 100 records per request and preserve source event IDs. Live import is blocked until the corresponding source adapter is bound; sample batches are clearly marked.

## Economics and candidate selection

Use integer currency micros at the service boundary and basis points for margin, fee and reinvestment rates. Do not use aggregate purchase counts as proof of incrementality.

Let `S` be mature media spend, `R` net attributed revenue after refunds, `m` the contribution-margin fraction before acquisition cost, and `f` the platform fee rate on spend. Contribution after acquisition is `P = R*m - S*(1+f)`. Media ROAS is `R/S`. Contribution ROI is `P/[S*(1+f)]`. These describe the registered attribution basis; they are not automatically causal ROI or total-company profit.

For additional spend `dS`, conservative contribution is `dP_low = dS*(m*r_low - 1 - f)`, where `r_low` is a separately validated lower bound on *marginal* revenue per added ad dollar. Current average ROAS cannot substitute for that marginal bound. Proposed spend is limited by the smallest of customer headroom, available Wallet funds, cash/inventory capacity, maximum budget step and positive realized contribution times the chosen reinvestment fraction.

Eligible candidates are 0%, 5%, 10%, 15% and 20% increases within customer policy. Each candidate must pass data freshness, maturity, verified tracking, known margin, enough mature outcomes, calibration/certification, supported channel, no unresolved material feedback blocker, minimum marginal ROI and a separately declared capacity envelope. Choose the candidate with the largest conservative incremental contribution among eligible candidates, with the smallest increase breaking ties. Retain zero spend as an explicit candidate and record why larger alternatives failed.

The initial numerical worker implements this deterministic bounded selector. It does not claim to learn a spend-response curve or establish causal effects. Feedback affects constraints and review needs; it never multiplies a forecast to make the economics look better.

## Persistence and authenticated API

Migrate the existing private Site to its supplied Vinext/Cloudflare runtime, preserving its project ID and owner-private audience. D1 stores OS policy, immutable feedback events, feedback resolutions, source snapshots, decisions, operations and audit events. Migrations are schema-only and append-only after deployment. Browser-local state remains a fixture for the older four-module cosmetic paths; OS records are server-backed and visibly distinguished.

Browser writes require Sites-injected signed-in identity and a same-origin request. A separately scoped service key supports automated verification/ingestion through the private Site, and is never shipped to the browser. The initial private workspace has one fixed fixture organization; no request-supplied organization grants access. The joint build replaces this with authoritative IdentityPort membership and multi-organization routing.

Proposed internal routes live under `/api/os/*`. They are application routes for `hell_yeah2`, not public Hellyeah APIs. Writes use idempotency keys, canonical payload hashes and append-only operation records. A reused key with a different body fails. Policy and decision transitions use optimistic revision predicates; stale approvals must be refreshed. D1 batches provide transactional mutation boundaries. Server JSON responses use `no-store`.

## Mastra workflow

Use a typed workflow with steps for normalization/context, feedback synthesis, economic evaluation and decision persistence. Deterministic tools own all calculations and gate decisions. Record completed input/output artifacts in D1 under the stable operation ID. Mastra orchestrates the same kernel tested by the local suite; no LLM key is required for this increment. Where the hosted runtime cannot execute Mastra directly, preserve a tested Node worker and a typed job boundary, disclose the split and never silently label a deterministic route as a Mastra run.

Automatic re-evaluation is event-driven for accepted feedback, resolution, policy or source changes. A browser closing does not erase accepted records. The first release is synchronous within a bounded request; long-running model/capture work must move to a leased outbox before activation. Missing source bindings produce a repair/hold decision, not guessed data.

## UI and customer incentives

- Growth OS: customer economics, growth headroom, latest recommendation, evidence checklist, feedback themes and decision history.
- Feedback: structured category/polarity/severity, text, campaign context and acknowledgement. Resolving a concern requires a reason and creates an audit event.
- Growth controls: customer return floor, maximum monthly media spend, maximum step and explicit profit-reinvestment fraction. Values are preferences, not a standing authorization to charge.
- Opportunities: conservative incremental contribution, proposed budget, assumptions and why a larger increase was rejected. Accept creates a review handoff; decline captures intent.
- Value proof: separate current attributed economics, validated incremental evidence and synthetic demo evidence. Display insufficient evidence and deteriorating returns as first-class results.

## Build sequence and release evidence

| Increment | Work | Exit evidence |
| --- | --- | --- |
| 1A | This plan, PRD extension, schema and pure decision kernel | Adverse cases hold; current average ROAS cannot qualify expansion |
| 1B | D1 repository, authenticated API and operation idempotency | Real SQLite tests, cross-scope rejection, replay and concurrency conflicts |
| 1C | Feedback ingestion, automatic product events and Mastra evaluation | Duplicate feedback does not double-count; source revisions create new decisions |
| 1D | Growth UI and controls wired to persistent services | DOM journeys, persisted HTTP round trip, build and private deployment |
| 2 | Joint internal Hellyeah adapters, transaction/outbox execution | Source Wallet parity, real identity, review callbacks and staged canary |
| 3 | Statistical learning and rollout | Held-out calibration, prospective customer contribution improvement and rollback |

Commit the plan and implementation as distinct increments. Push each verified source checkpoint to the available source repository. Mirror to GitHub `hell_yeah2` as soon as its existing two-factor blocker is resolved. Do not claim that the preview Git remote is GitHub.

## Acceptance and stopping rules

Tests must cover deduplication and conflict, malformed input, feedback text escaping, unknown source/organization, stale policy revision, missing margin/tracking, immature and stale outcomes, uncertified marginal predictions, negative contribution, no cash headroom, feedback blockers, capacity and step bounds, unchanged source Wallet, explicit accept/decline, history preservation and persistence across a new repository instance. Verify failure responses do not leak keys or source payloads.

Product success is customer contribution, retention and defensible expansion measured prospectively. Secondary diagnostics include coverage of feedback collection, response rate with its denominator, unresolved concern age, measurement completeness, recommendation timeliness and override reasons. Top-ups and raw spend growth are reported separately. Do not optimize feedback positivity, click-through on spend prompts or approval rate as substitutes for customer value.

This implementation completes a persistent learning-and-decision slice, not the entire production OS. Live service bindings, randomized policy evaluation, calibrated response models, persistent Mastra step storage and real-money activation remain explicit subsequent gates. The durable worker increment is documented in [background operations](background-operations.md).

## Expanded implementation

The user requested separate personal and aggregate learning plus a measurable 2–5× improvement ambition. The implemented algorithm, release gate, privacy boundaries, continuous refresh behavior and precise next steps are in [the OS learning design](os-learning-design.md). This extension supersedes earlier exclusions of all statistical learning, while leaving certified financial model promotion and unattended durable execution as subsequent gates.

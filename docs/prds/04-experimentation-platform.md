---
id: HY-04
version: 2.0.0
repository: hell_yeah2
status: implementation_ready_specification
document_pages: 12
pagination: explicit_numbered_sections
primary_framework: Mastra
parent_prd: 01-autonomous-growth-os.md
default_adapter: fixture
---

# Experimentation Platform

Product Requirements Document

hell_yeah2 | PRD 04 | Version 2.0 | October 18 2026

## Page 01 Product decision

Build the measurement and execution infrastructure that turns campaign ideas into controlled tests, preserves what happened, and permits larger actions only when evidence and authority support them. This platform supplies the shared decision ledger for the growth OS.

The first release registers hypotheses, validates metrics, runs first-party landing-page experiments and supports eligible Google Search campaign experiments through a versioned adapter. Live campaign tests start with explicit operator approval. Client views explain the question, spend, evidence and resulting decision.

**Primary users:** growth operators designing and interpreting tests, platform engineers maintaining reliable execution, and applied scientists evaluating decision policies. **Client users:** advertisers approving scope and reviewing results.



## Product value

Creative Intelligence provides source-backed hypotheses. The Simulator provides conditional predictions. Experiments returns mature measured outcomes with their uncertainty and validity checks. The system can improve as this record grows, provided new models and policies demonstrate gains against held-out or randomized comparisons.

The first objective is a complete, trustworthy decision cycle for one advertiser. Handling large ad budgets requires additional operational and prospective validation; transaction volume alone is not evidence that the decision engine is effective.

<!-- PAGE -->

## Page 02 Experiment lifecycle and requirements

An operator selects a hypothesis, defines the population and estimand, registers the primary metric, computes feasibility, freezes the plan and requests approval. The execution gateway validates authority and provider state before any live change. The platform monitors health, waits for mature outcomes and publishes a versioned result.

| ID | Requirement | Acceptance behavior |
| --- | --- | --- |
| EXP 01 | Register before launch | Freeze hypothesis, control, treatment, eligibility, randomization unit, primary metric, analysis, duration, budget, guardrails and stopping rules. |
| EXP 02 | Check feasibility | Estimate sample size, traffic, conversion delay and minimum detectable effect; return a feasible window or a specific reason to revise the plan. |
| EXP 03 | Bind approval | Approval identifies tenant, account, plan hash, authorized action set, maximum budget/exposure and expiry. Material edits invalidate it. |
| EXP 04 | Execute safely | One gateway owns provider writes, verifies current state, records requests/readback and reconciles unknown outcomes before retrying. |
| EXP 05 | Monitor validity | Check allocation, missing outcomes, overlapping experiments, tracking changes, spend and provider state; distinguish invalidity from a losing result. |
| EXP 06 | Analyze and decide | Publish effect, uncertainty, practical threshold, maturity and validity. Allow inconclusive, invalid and harmful conclusions. |
| EXP 07 | Learn reproducibly | Link prediction, actual action, exposure, spend, mature outcome and model/policy versions. Preserve unsuccessful tests and overrides. |

## Lifecycle states

Use draft, registered, awaiting_approval, provisioning, scheduled, running, paused, awaiting_maturity, analyzing and concluded. Use failed or cancelled for operational ends. A concluded result has a separate verdict: beneficial, harmful, inconclusive or invalid. Keep provider state distinct from application state.

Each transition has an authorized actor, an expected prior version, a timestamp and evidence. A cancelled draft cannot resume because of a late callback. A paused campaign requires confirmed provider readback before the interface describes it as stopped.

## Client reporting

Show the hypothesis and business threshold before significance. Include an allocation view, spend and data freshness, a version timeline, the final result and next decision. A client can approve only the configured scope; viewing a report grants no execution permission.

<!-- PAGE -->

## Page 03 Experimental design and statistical validity

**First-party landing-page tests.** Randomize eligible, consented visitors using a stable pseudonymous unit and deterministic keyed assignment. Freeze eligibility and exclusions before assignment. Store assignment separately from page exposure and outcomes. Use an intention-to-treat primary analysis over all eligible assigned units, with a predeclared conversion window. Deduplicate outcomes and handle repeat visitors at the assignment unit.

For a binary outcome, predeclare a fixed-horizon two-arm analysis, two-sided alpha of 0.05, power of 0.80 and the smallest effect worth acting on. Estimate traffic needs from a baseline rate and account for repeat-unit clustering or unequal allocation when applicable. Inspect dashboards for safety, but do not repeatedly stop at the first favorable p-value. Sequential efficacy testing requires a separately validated, prespecified sequential method.

**Native Google Search tests.** Use the supported native experiment mechanism for eligible campaigns; do not pretend a local hash can assign Google's auction traffic. Record the provider's actual split mode, experiment resources, arms and reporting basis [S2, S3]. Freeze the chosen primary manipulation and detect external edits that contaminate the test.

The implementation spike must confirm which valid uncertainty estimates and assignment diagnostics the chosen Google API/reporting surface exposes. Use a reviewed native result when available. Aggregate daily campaign totals are not independent randomized units and must not feed a naive visitor-level significance test. Where sufficient statistics or an appropriate provider result are unavailable, publish a descriptive comparison, mark causal inference unavailable and require analyst review; do not auto-declare a winner.

## Metrics and interpretation

Choose one primary outcome that matches the decision. For a landing-page test, this may be a purchase or qualified inquiry per assigned visitor. A treatment can change which users click; click-conditioned conversion rates can therefore mislead for campaign-level causal claims. Respect the provider experiment's estimand and budget regime.

Secondary metrics are exploratory unless the analysis plan includes a multiple-testing procedure. Correct declared confirmatory families and preserve the full tested family. Check sample-ratio mismatch where assignment counts are available. Do not equate balanced spend or clicks with proof of balanced randomization.

Wait for the registered attribution/conversion window and data-maturity policy. Label modeled or fractional attributed conversions and use an analysis appropriate to those measurements. Track tracking loss, conversion-definition drift, provider learning periods, interference and novelty effects. Failing validity checks produces an invalid or qualified result rather than a quietly revised experiment.

<!-- PAGE -->

## Page 04 Mastra workflows and execution control

Use a **designExperiment** workflow to validate a HypothesisSpec, call power/feasibility tools, check conflicts and produce an ExperimentPlan. A bounded research agent can explain alternatives; deterministic code owns allocation, statistics and permission checks.

The **approveAndLaunch** workflow stores the canonical plan hash, suspends for an authorized reviewer, and resumes only after the application validates a current approval [S4]. The workflow creates an execution intent; it does not write to the advertising account directly. A rejected or expired approval ends the request cleanly.

The **monitorAndConclude** workflow reconciles provider state, reads health checks, waits through conversion maturity and calls the versioned analysis worker. It stores a ResultBundle before asking an agent to draft the client narrative. Mastra traces and scorers check explanations; they do not replace statistical analysis [S5].

## Execution gateway

Only Hellyeah's existing execution service holds managed advertising credentials. The OS gateway calls that service under an internal scoped contract; it does not open a parallel Google write path. Keep credentials in a secret store, bound to tenant/account and least privilege. The gateway verifies plan hash, approval expiry, actor permissions, kill-switch state, current provider configuration, budget reservation and permitted action type on every attempt.

Persist intents through a transactional outbox. Serialize conflicting account/campaign actions with a lease and fencing token enforced by the application. Use local deduplication and provider operation/resource records. An API timeout creates an unknown state: query the provider before retrying. A local idempotency key is not a promise of exactly-once external effects.

Validate partial failures and long-running provider operations. Record the proposed diff and confirmed state. Freeze unrelated mutations on an enrolled experiment; external changes produce a conflict that needs review. Promotion and rollback are explicit, auditable actions.

## Budget and incident controls

Maintain per-test, per-account and per-tenant limits, cumulative experimental spend, reserved exposure, reporting lag and an operator-approved uncertainty buffer. Reconcile observed spend frequently and fail closed for new actions when data is stale. Google average daily budgets and reporting delays mean a local cap cannot guarantee exact real-time spend containment [S6].

When a guardrail trips, block new actions, request provider-side pause, notify the configured operator and verify readback. Show pause_requested separately from pause_confirmed and retain late spend. Test kill switches at tenant and global levels. If the provider is unavailable, keep retrying the bounded pause/reconciliation path and show the unresolved exposure clearly.

<!-- PAGE -->

## Page 05 Shared contracts and interfaces

Use the organization, schema-version and trace envelope from the OS PRD and the numerical conventions in PRD 02. Separate internal processing time from provider event time. Store an immutable history rather than overwriting plans and results.

| Record | Required information |
| --- | --- |
| ExperimentPlan v1 | Hypothesis ID, arms and versioned assets, eligibility, assignment unit/mode, primary estimand, metrics, analysis, power assumptions, budget, duration, maturity rule, guardrails and plan hash |
| ApprovalGrant v1 | Plan hash, tenant/account, approver role, permitted operations, budget/exposure envelope, issued_at, expires_at and revocation state |
| AssignmentEvent v1 | First-party experiment ID, pseudonymous unit, eligibility version, arm, allocation probability, assigned_at and deduplication key |
| ExecutionIntent v1 | Plan/approval refs, proposed diff, expected provider state, reservation, status, deduplication key, operation IDs and provider readback |
| ResultBundle v1 | Frozen analysis inputs, metric definitions, effect and uncertainty, maturity, validity diagnostics, verdict, analysis code version and limitations |
| DecisionRecord v1 | Information cutoff, candidate set, prediction, chosen action, approval, execution, outcome, baseline, policy version and operator override |

**HTTP contract.** POST /v1/experiments creates a draft. POST /v1/experiments/{id}/register freezes the plan. POST /v1/approvals records an authorized grant. POST /v1/experiments/{id}/launch accepts an intent with an idempotency key and expected plan version. POST /v1/experiments/{id}/pause requests a controlled pause. GET /v1/experiments/{id}/results returns the current pinned result and maturity state.

First-party assignment and conversion endpoints are separately authenticated, deduplicated and rate-limited. Provider callbacks are authenticated and replay-protected where supported; polling reconciles missed callbacks. Conflicting versions return 409; unauthorized scope returns 403. No endpoint trusts tenant/account identifiers solely because an agent supplied them.

## Compounding intelligence

Store positive, null, harmful and invalid results. A learning job builds a versioned dataset with the original information cutoff and mature labels. Creative features update only from appropriate evidence; forecasting models undergo temporal validation; decision policies require prospective evaluation.

Retain candidate sets and logged action probabilities only when an actual randomized policy supplies them. Later off-policy evaluation requires overlap, correct propensities and appropriate estimators; deterministic historical choices cannot establish the value of untried actions. Keep an independent holdout for any adaptive allocation. Bandit optimization is a later product mode with separate analysis, not a renamed A/B test.

<!-- PAGE -->

## Page 06 Verification and release gates

The following targets define the proposed pilot. All checks must run on the same plan and execution versions that will enter the pilot.

| Test | Proposed release gate |
| --- | --- |
| Registration integrity | Running experiments cannot mutate their hypothesis, primary outcome, allocation or analysis plan without a new experiment/version and review. |
| A A behavior | A valid null simulation over at least 10,000 repetitions has false-positive rate statistically consistent with alpha 0.05; real A/A checks validate assignment and event plumbing separately. |
| Power and inference | Simulated effect and null cases match declared error/power behavior; repeat-unit, delayed-outcome and missing-event fixtures are covered. |
| Assignment | Stable first-party assignment under retries and deploys; no cross-tenant collisions, duplicate assignments or outcome-driven exclusions. |
| Crash and API recovery | Timeout before/after provider acceptance, duplicate callbacks and partial failures produce no unreviewed duplicate campaign or change. Unknown states reconcile before retry. |
| Authority | Wrong account, expired/revoked grants, stale plan hashes and blocked kill switches fail closed on every attempt. |
| Budget response | Threshold detection blocks new intents immediately; pause request within 60 seconds under normal dependencies. Measure provider confirmation separately without claiming a guaranteed final spend ceiling. |
| Data reconciliation | Daily cost totals within 0.5 percent of provider reports after the agreed lag window; conversion/value discrepancies use separate maturity-aware checks. |

## End to end acceptance scenario

Import a pilot account snapshot, review a captured landing page, generate a hypothesis, simulate a supported change, register a plan and approve its exact scope. Provision through the gateway, verify provider state, collect outcomes, wait for maturity and publish a result linked to the original prediction. Restart a worker during provisioning and repeat the reconciliation checks. Verify client access and a complete audit trail.

## Reliability and cost

Proposed pilot targets are 99.5 percent monthly availability for read/report APIs, a five-minute or better observation cadence while a budget-sensitive test is active, and explicit stale-data alarms. Provider reporting lag remains visible. Load-test internal events at ten times expected pilot peak; do not claim scale from aggregate ad-spend size alone.

Use structured logs and OpenTelemetry with plan, run, intent and provider resource IDs. Track compute/model cost, manual review time, write failures, reconciliation delay, invalid tests and time to pause confirmation. Nightly replay and periodic rollback drills must prove that restored data can reconstruct the decision history.

<!-- PAGE -->

## Page 07 Delivery and autonomy stages

**Weeks 1–2:** build the experiment registry, shared metrics, decision records and replay harness alongside the platform foundation. **Weeks 3–5:** ship first-party assignment, conversion ingestion, power analysis and reviewed result reports. Run A/A checks before interpreting treatment effects.

**Weeks 6–8:** complete the Google Search adapter, approval workflow, gateway, reconciliation and pause controls. Use a narrowly scoped approved live pilot. **Weeks 9–12:** collect mature outcomes, test forecast calibration and review policy value. Insufficient traffic extends the measurement calendar.

Start with read-only recommendations, then approved single actions. Allow bounded autonomous changes only after a separately approved policy defines accounts, action types, spend envelope, expiry, monitoring and rollback. Expanding a budget or starting a new campaign requires authority covering that action. Global autonomy is outside the first release.

## Responsibilities and dependencies

The platform engineer owns connectors, credentials, job delivery and the execution gateway. The applied AI engineer owns Mastra workflows and evidence-backed reporting. The scientist owns estimands, analysis and model/policy validation. The growth operator owns business thresholds, campaign context and pilot approval.

Use the assumed joint-team internal service access and an eligible Hellyeah managed Search campaign, first-party conversion instrumentation, account owner authority, incident ownership and acceptable reporting lag. The repository can implement fixtures, registration and read-only reports before live access is available.

## Product design

Use the official orange #FF4301 for the primary next action, navy #0D0C2B for navigation and controls, and white/gray surfaces for evidence [S1]. Use Lastik Regular for display headings and GeneralSans for interface text. Pair every state with a readable label; reserve orange for action and attention rather than treating it as a universal success color.

Separate observed lift from predicted lift in the interface. Display interval, metric definition, sample/assignment basis, data maturity and decision threshold beside the result. Make inconclusive and invalid verdicts as clear as beneficial ones. The approval view shows the exact diff, total authorized exposure and expiry before confirmation.

## Primary sources

[S1] Hellyeah brand — https://www.hellyeahai.com/brand

[S2] Google Ads experiments — https://developers.google.com/google-ads/api/docs/experiments/overview

[S3] System-managed experiments — https://developers.google.com/google-ads/api/docs/experiments/system-managed

[S4] Mastra human review — https://mastra.ai/docs/workflows/human-in-the-loop

[S5] Mastra evaluations — https://mastra.ai/docs/evals/overview

[S6] Google Ads spending limits — https://support.google.com/google-ads/answer/10486637

Sources checked October 18, 2026. Architecture, statistical gates and service targets are proposed requirements for hell_yeah2.

<!-- PAGE -->

## Page 08 Compatibility with launch review and managed accounts

Integrate experiments through Hellyeah's campaign orchestration and managed ad accounts. The OS gateway calls the existing source transaction/review boundary; it does not independently provision an advertiser account, charge a separate Wallet or bypass the launch readiness rail. Native Google experiment capabilities are internal adapter capabilities, not assumed public Hellyeah features.

The experiment plan and Hellyeah campaign are separate records. A registered test can reference a draft and its proposed treatment without being funded or serving. Submission must verify the current organization, Brand Profile, creative readiness, targeting, schedule, Wallet availability and X-Ray requirement for conversion goals. A model's approval recommendation is not the source content review.

Keep Search keywords read-only. Tests that change a priced keyword strategy must use the supported strategy/repricing workflow and freeze a new reviewed draft. Do not repurpose a general provider API credential to evade this product boundary. Performance Max tests require their own supported native mechanism and valid metric design; Search experiment code is not automatically applicable.

Existing launch confirmation remains required. A future delegated policy may cover specified actions only after Hellyeah jointly implements and approves that integration. The public CLI does not establish such delegation, and installation confirmation flags do not grant financial authority.

The live result path uses internal managed-account delivery and X-Ray outcomes with provenance. Campaigns in review or setup do not yet contribute served exposure. A rejection or setup failure is an operational result and refund case, not a failed causal treatment.

**Compatibility acceptance:** a frozen plan submits once into the existing reservation/review state; rejected review never serves; conversion launch fails without verified X-Ray; PMax capability mismatches return unsupported; and the existing Dashboard still manages the campaign if the OS is disabled.

<!-- PAGE -->

## Page 09 Wallet reservation settlement and pause examples

Use the source Wallet transaction as the authority. For an illustrative fixture, an organization has USD 500 available and approves a campaign maximum of USD 200. Source submission reserves USD 200 once. A repeated local request with the same key and plan returns the same operation and reservation. A different payload using that key is a conflict.

If the source accepts submission but the response is lost, the local intent becomes unknown. Reconcile campaign, reservation and source operation before deciding whether a retry is safe. If the source lacks a suitable lookup/deduplication facility, require a joint implementation of that facility or route to manual resolution; do not claim local storage alone prevents duplicate remote effects.

If the campaign is rejected before ad-platform setup, show the source refund/release state. If it may have served, cancellation waits for the documented settlement process. A pause retains the campaign and does not automatically release its budget. Pending refunds cannot fund another intent. Late spend updates continue to reconcile after pause/cancellation.

An OS exposure reservation limits concurrently authorized decisions and remains distinct from financial funds. Use source Wallet version and an optimistic concurrency/fencing strategy at the integrated execution boundary. Re-check available funds and authority immediately before submission; a planning-time balance may be stale.

**Incident example:** a spend alarm blocks new related intents, sends the supported pause request and records pause_requested. If the provider is unreachable, the view reports unresolved delivery/exposure, continues reconciliation and escalates to the configured operator. Only confirmed source state changes the view to paused. Do not display a guaranteed stop time or zero additional spend during reporting lag.

**Acceptance:** verify reservation conservation, duplicate/changed-payload keys, ambiguous acceptance, pre-setup release, late settlement and unavailable pause. Source transaction IDs must connect the OS explanation to the exact Wallet record.

<!-- PAGE -->

## Page 10 Assignment events and analysis implementation

The first-party reference design uses a keyed hash of organization, experiment version, assignment epoch and pseudonymous unit to assign an arm. Keep the key secret in production, persist the assignment and preserve it across visits and deploys. Allocation changes require a new epoch/experiment design rather than rebucketing existing units silently.

Eligibility uses pre-treatment conditions. Record assignment even when a later page exposure fails, so the intention-to-treat denominator does not selectively drop failures. Conversion events reference the assignment and registered outcome window. Deduplicate by a stable business/source event key. Track late and unmatched events separately rather than guessing their arm from the latest page visit.

An illustrative fixture has 200 assigned units per arm with 20 control and 25 treatment conversions. The descriptive rates are 10 and 12.5 percent and the observed absolute difference is 2.5 percentage points. This small example demonstrates arithmetic and linkage; it is not evidence of a reliable winner. Report uncertainty and the registered practical threshold before deciding.

Do not apply this visitor-level analysis to Google's aggregate campaign totals. A native campaign test records its supported allocation/reporting basis and either a reviewed valid provider/analyst result or a descriptive limitation. The internal adapter must expose enough information to support the selected method. Missing evidence produces a qualified/inconclusive result.

| Analysis case | Required treatment |
| --- | --- |
| Repeated visitor | One stable assignment; appropriate unit-level/cluster handling |
| Client/server duplicate purchase | One deduplicated business outcome |
| Fractional attributed conversions | Appropriate non-binomial analysis or descriptive reporting |
| Early dashboard peeking | Safety monitoring only under fixed-horizon design |
| Missing events differ by arm | Validity investigation and possible invalid verdict |
| Overlapping experiments | Registered interference policy or exclusion |

**Acceptance:** test actual-null false positives, power, outcome delay, repeat units and tracking loss. Correct arithmetic on a single tiny example does not certify the inference implementation.

<!-- PAGE -->

## Page 11 Agent tasks transport and measurement operations

The earlier `/v1` routes are proposed OS APIs, not documented Hellyeah public endpoints. Bind them to the joint platform's internal transports and existing authenticated organization context. Use an explicit capability manifest so unsupported launch/experiment/pause operations fail before any side effect.

| Task | Required artifact | Verification |
| --- | --- | --- |
| EXP BUILD 01 | Registry and immutable plan hashing | Mutation and source-version rejection |
| EXP BUILD 02 | First-party assignment/exposure/outcome log | Stable bucketing, deduplication and missing events |
| EXP BUILD 03 | Power and analysis worker | Null/effect simulations and maturity gates |
| EXP BUILD 04 | Hellyeah campaign/Wallet adapter | One source reservation and correct review lifecycle |
| EXP BUILD 05 | Approval and execution gateway | Scope, expiry, revocation and retry checks |
| EXP BUILD 06 | Monitoring and reconciliation | Stale data, partial failure and pause drill |
| EXP BUILD 07 | Result reports and learning export | Exact metric/provenance and invalid-result retention |

Persist expected source state with every intent. Authenticate callbacks and treat duplicate or reordered notifications as normal. A notification wakes reconciliation; it need not be the final truth when the source API offers an authoritative current state. Source polling covers missed events and catches out-of-band changes.

Define event-time watermarks, acceptable lateness and maturity per metric. Revenue from browser events, server webhooks and Shopify paid-order data must reconcile before value optimization. A source's public collection acknowledgment does not prove the event is accepted into analysis. Track accepted source outcomes through protected internal reads.

Mastra coordinates design, review, monitoring and reports; deterministic tools own assignment, statistics, authority and money checks. Model calls have deadlines and schema validation. No narration can turn an invalid test into a beneficial result or change the registered analysis after outcomes are inspected.

**Acceptance:** an agent and a direct API client produce equivalent registered plans and source intents; they cannot diverge on financial authority because one used a conversational approval.

<!-- PAGE -->

## Page 12 Substitution plan and experiment definition of done

The runnable offline reference uses a deterministic managed campaign, Wallet emulator, tracker health, plan, approval and mature fixture outcomes. It demonstrates the shared decision loop without calling Google, X-Ray collection or a payment service. Simulated source review is labeled and has no authority outside fixture mode.

For joint staging, bind IdentityPort, CampaignPort, WalletPort, XRayPort and ReviewPort to authoritative internal services. Record exact request/response types, supported experiment methods, reconciliation lookups, money units and error semantics. Replace fixture identities and transport through certified adapters; reject mixed-mode payloads. The same domain suite must pass against sanitized staging examples.

| Completion layer | Evidence required |
| --- | --- |
| Specification | Twelve substantive pages; all lifecycle/contract ownership resolved |
| Local reference | Happy path, duplicate retry, readiness and grant denials |
| Statistical implementation | Valid A/A, power, inference and missing-data behavior |
| Staging adapter | Source campaign, reservation, tracker and review parity |
| Approved pilot | One exact authorized action with confirmed readback and mature outcomes |
| Bounded autonomy | Separately adopted authority contract and prospective policy evaluation |

Production readiness also requires durable jobs and data, secret storage, scoped access, complete UI, incident ownership, rollback and financial reconciliation. The OS may recommend tests while those components are being completed, but it must not describe that mode as autonomous live spend management.

Compatibility references are [Campaigns](https://docs.hellyeahai.com/campaigns), [Managed ad accounts](https://docs.hellyeahai.com/managed-ad-accounts), [Wallet](https://docs.hellyeahai.com/wallet), [Approvals](https://docs.hellyeahai.com/billing-safety/approvals), [Refunds](https://docs.hellyeahai.com/billing-safety/cancellations-refunds) and [X-Ray events](https://docs.hellyeahai.com/tracking/track-events), checked October 18, 2026. Read the OS PRD before implementing this module so its capabilities, fixture substitution and authoritative boundaries remain consistent.

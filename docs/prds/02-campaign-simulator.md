---
id: HY-02
version: 2.0.0
repository: hell_yeah2
status: implementation_ready_specification
document_pages: 12
pagination: explicit_numbered_sections
primary_framework: Mastra
parent_prd: 01-autonomous-growth-os.md
default_adapter: fixture
---

# Campaign Simulator

Product Requirements Document

hell_yeah2 | PRD 02 | Version 2.0 | October 18 2026

## Page 01 Product decision

Build a workspace where a growth operator can compare a campaign plan with a baseline before committing money. Show a distribution of plausible outcomes, the evidence behind it, and the experiment most likely to reduce the remaining uncertainty. Launch with Google Search and one advertiser at a time.

The simulator is the planning surface of the growth OS. Creative Intelligence supplies versioned evidence and hypotheses. Experiments returns measured outcomes that can recalibrate forecasts. All three use the same campaign, creative, snapshot and decision identifiers.

**Primary user:** a paid-media operator deciding whether to launch, change a budget, revise an offer or test a landing page. **Client user:** an advertiser reviewing assumptions, downside and the proposed next step.



## First release

Accept a managed-account snapshot supplied by Hellyeah or a validated fixture upload; compare a baseline and up to five alternatives over a stated horizon. Return expected spend, conversions, CPA and, when supported, revenue and ROAS, with 80 and 95 percent prediction intervals. Let the operator save a scenario, export a client brief, and prepare an experiment without authorizing spend.

**Business objective:** improve the quality and speed of budget decisions. Treat forecast accuracy and experimentally measured business value as separate success measures.

<!-- PAGE -->

## Page 02 Operator journey and requirements

The operator selects a Hellyeah organization, managed campaign and goal, confirms the conversion definition, and chooses a data cutoff. The system checks data quality and creates an immutable snapshot. The operator changes budget, geography, read-only keyword-plan assumption, creative version or landing-page version; the simulator explains which changes the model can support.

| ID | Requirement | Acceptance behavior |
| --- | --- | --- |
| SIM 01 | Validate inputs | Reject mixed currencies, missing time zones, incompatible conversion definitions and duplicated aggregates; show repair instructions. |
| SIM 02 | Compare plans | Display baseline and alternatives on the same horizon, objective and attribution basis. Preserve all assumptions when duplicating a plan. |
| SIM 03 | Expose uncertainty | Separate parameter uncertainty, future outcome variation and unknown effects. Show the chance of meeting a target, not a single guaranteed result. |
| SIM 04 | Explain a forecast | Link every factual input to its snapshot or source; distinguish user assumptions from fitted quantities and unsupported changes. |
| SIM 05 | Stress a plan | Recalculate under demand, CPC, conversion-rate and conversion-delay shocks selected by the operator. |
| SIM 06 | Propose a test | Create an ExperimentPlan draft with the hypothesis, candidate action, baseline, expected effect range and decision threshold. |
| SIM 07 | Publish a brief | Produce a tenant-scoped report with the range, downside, assumptions, freshness and decision history. Client viewers cannot edit models or approve spend. |

## Screen behavior

Use a left scenario editor, a central comparison chart and a right evidence drawer. The result summary names the goal and horizon before displaying money. Offer an accessible table for every chart. Selecting an interval opens its definition, sample coverage and backtest performance.

The primary button reads **Run simulation**. A separate **Prepare experiment** action opens a reviewable draft. Editing an assumption marks prior outputs stale and requires a new run; previously shared reports remain pinned to their original snapshot.

## Empty and uncertain states

With no account data, offer a labeled planning exercise using operator-supplied ranges. Do not present illustrative output as an account forecast. With sparse or out-of-distribution inputs, widen intervals or abstain with a specific missing-data explanation. If a horizon has a material probability of zero conversions, show that probability and leave CPA undefined for those draws rather than dividing by zero.

<!-- PAGE -->

## Page 03 Simulation methods and fidelity

Use a versioned probabilistic funnel rather than asking an LLM to invent performance numbers. Start with an auditable baseline; increase model complexity only when it improves prospective validation.

**Historical baseline.** Estimate demand and spend capacity by stable campaign groups, weekday, geography and device where sample sizes permit. Model clicks, cost per click and conversion probability from observed data. Use beta-binomial shrinkage for sparse conversion rates and an empirical bootstrap or suitable positive distribution for CPC. Keep jointly observed shocks together so that CPC, volume and conversion rate do not become falsely independent.

**Budget response.** Learn a monotone, saturating spend-to-volume response within historical support. Observational spend changes may reflect targeting, seasonality or operator selection; mark this curve as associational until randomized evidence supports the effect. A larger budget need not buy proportionally more conversions. Unsupported keyword, market or offer changes become sensitivity assumptions or proposed tests.

**Posterior predictive simulation.** Draw model parameters and future outcomes separately. Respect demand ceilings and the stated budget policy; simulate conversion delay over the forecast horizon. Compute CPA and ROAS within each draw and summarize the resulting distributions. Calculate ROAS only with a reconciled conversion-value definition and disclose whether it represents revenue or another value measure. Never treat revenue ROAS as profit.

**Creative evidence.** In the first release, Creative Intelligence suggests scenario dimensions and hypotheses. It contributes no numerical uplift simply because a vision model likes an asset. A later model can use creative features after temporal and advertiser-held-out evaluation shows additional predictive value. Only consented, isolated data may support any cross-account prior.

## Fidelity levels

| Level | Evidence available | Product language |
| --- | --- | --- |
| Planning | User ranges or broad priors | Assumption exercise; no claim of account calibration |
| Historical | Reconciled account history and temporal validation | Conditional forecast within observed support |
| Experiment informed | Relevant completed controlled tests | Forecast updated with measured effects and transport limits |
| Policy validated | Prospective controlled evaluation of a decision policy | Eligible for a separately approved bounded policy |

## Limits that change the decision

The product does not recreate Google's auction, bid optimizer or hidden quality signals. Do not call it an auction digital twin. Log distribution shifts, campaign changes, attribution changes and unsupported extrapolation. Show a value-of-information estimate only when its assumptions are explicit; an honest next-test ranking is preferable to a fabricated dollar value.

<!-- PAGE -->

## Page 04 Mastra workflows and service boundaries

Use Mastra for typed orchestration, analysis coordination and evidence-backed explanations. Configure persistent workflow snapshots and model/prompt versions. The numerical worker owns forecast computation; the reporting agent consumes its immutable outputs without changing numbers. Mastra's workflow and suspension capabilities support this design [S2, S3].

The **simulateCampaign** workflow validates a ScenarioSpec, resolves the data snapshot, checks support, calls the numerical worker, runs calibration checks, stores a ForecastBundle and drafts an explanation. A low-confidence result can still be published with its limitations; it cannot silently become a confident recommendation.

The **prepareExperiment** workflow converts a selected comparison into a typed hypothesis and experiment draft. Mastra suspends when a reviewer must supply information or approve the plan. The application verifies reviewer authority and binds approval to the exact plan hash before resuming. Changing a material field invalidates approval.

## Shared architecture

| Component | Responsibility | Initial implementation |
| --- | --- | --- |
| Web application | Editor, comparisons, evidence and client reports | Next.js and TypeScript; shared design tokens |
| Mastra service | Bounded agents and typed workflows | Research, explanation, proposal and review coordination |
| Numerical workers | Forecast fitting and predictive draws | Versioned Python jobs with pinned packages and fixed seeds |
| Operational database | Tenant, snapshot, scenario and decision records | PostgreSQL with tenant-scoped access and immutable versions |
| Evidence store | Raw reports, capture references and model artifacts | Private object storage with access-controlled downloads |
| Job system | Dispatch, retries and cancellation | Transactional outbox, leases, bounded workers and dead letters |

Keep these as modules in one repository and a small number of deployables. Isolate browser capture and numerical jobs from interactive web requests. A durable job coordinator resumes suspended work after a callback or scheduled event; process-local timers are insufficient for recovery.

## Failure and recovery

Use at-least-once delivery with idempotent result writes. A unique tenant/run/step key prevents duplicated ForecastBundles. Persist inputs and versions before dispatch. On worker loss, retry the same immutable task; on source changes, create a new snapshot. Pin any published report to its exact run.

A simulation has no advertising write credential. The execution gateway defined in PRD 04 calls Hellyeah's existing launch and review services as the sole route for live actions. LLM token limits, run deadlines and per-tenant concurrency limits bound analysis cost. Abort or degrade gracefully when source access is revoked or model outputs fail schema validation.

<!-- PAGE -->

## Page 05 Data contracts and interfaces

All shared records include tenant_id, schema_version, record_id, occurred_at, created_at and trace_id where applicable. Use UTC for stored event time and retain the advertiser's reporting timezone. Store money as integer micros with an explicit ISO currency. Preserve source attribution settings and conversion maturity.

| Record | Required information |
| --- | --- |
| MetricSnapshot v1 | Account and campaign IDs, reporting dates, timezone, currency, impressions, clicks, cost, conversions, value, attribution basis, cutoff, extraction version and content hash |
| ScenarioSpec v1 | Snapshot ID, horizon, objective, baseline, candidate actions, creative versions, constraints, user assumptions and canonical plan hash |
| ForecastBundle v1 | Scenario ID, model artifact, code and data versions, seed, draw count, point summaries, intervals, zero-conversion probability, support flags and calibration report |
| DecisionRecord v1 | Candidate set, selected action, baseline, rationale references, information cutoff, policy version, approval and eventual outcome references |
| ResearchReport v1 | Audience and access scope, immutable forecast reference, assumptions, evidence links, freshness and export version |

**HTTP contract.** POST /v1/simulations accepts a ScenarioSpec reference and an idempotency key; return 202 plus run_id and status_url. GET /v1/simulations/{id} returns status and, when ready, the ForecastBundle. POST /v1/simulations/{id}/experiment-drafts returns a draft reference. POST /v1/reports pins a report version. Authenticate every request and enforce tenant scope on both metadata and artifacts.

Reject conflicting idempotency-key reuse with 409. Return a structured validation error for unsupported input and 403 for unauthorized scope. Expired sources and failed jobs retain their status and repair path; do not replace failure with fabricated output.

## Measures of success

Track operator time from a valid snapshot to a reviewable plan; report median and 90th percentile. Track forecast coverage, interval width, proper scoring rules and error by supported segment. Track abstention rate and the share of accepted recommendations later evaluated in experiments.

A product-value measure is the change in contribution after ad cost under a validated policy versus a randomized incumbent, when contribution data exists. Otherwise report the registered conversion/value metric. Account for computation and operator cost separately. Increased spend or a lower modeled CPA alone does not establish improved customer value.

## Research surfaces

Client views include a scenario comparison, an assumptions sheet, a downside summary and a forecast-versus-observed page after outcomes mature. Freeze exports for reproducibility. Corrections create a new report version and link back to the superseded result.

<!-- PAGE -->

## Page 06 Validation and release criteria

All numeric targets below are proposed pilot gates. They are not measured product results. Set the evaluation dataset and thresholds before fitting a candidate model; retain failed runs.

| Test | Proposed release gate |
| --- | --- |
| Reproducibility | Identical snapshot, model, seed and runtime produce identical stored summaries within documented numerical tolerance. |
| Historical validation | At least 100 non-overlapping eligible campaign-week forecast cases, with uncertainty clustered by campaign/account; chronological holdouts and no future data. If evidence is insufficient, remain in planning mode. |
| Baseline comparison | At least 10 percent lower mean weighted interval score than the declared seasonal/shrunk baseline; publish interval width and errors by segment. |
| Calibration | Nominal 80 percent intervals achieve 72–88 percent empirical coverage on the frozen holdout, with uncertainty reported. Investigate subgroup failures; gate any failing segment. |
| Meaningful uncertainty | Calibrated intervals must pass a predeclared usefulness bound for the decision; arbitrarily wide intervals do not pass merely by covering outcomes. |
| Evidence integrity | Every numerical statement in generated briefs matches a stored field; every factual input has provenance. Test missing evidence, sparse data and unsupported assumptions. |
| Performance | 95th percentile below 60 seconds for five scenarios with 10,000 draws each against the declared pilot dataset and worker hardware. Otherwise use an asynchronous status view. |
| Isolation and recovery | Cross-tenant reads fail; cancellation works; a killed worker resumes without duplicate results. |

## Model and agent evaluation

Use temporal splits for forecasting and advertiser-held-out splits before claiming cross-account generalization. Freeze an evaluation cohort and compare promotion candidates with the incumbent. Check outcome leakage from conversion revisions, screenshot timing and feature extraction dates.

Mastra scorers evaluate schema validity, source grounding and numerical consistency [S4]. Statistical tests evaluate forecast quality separately. A fluent explanation and a high LLM-judge score cannot establish calibration or business impact.

## Pilot rollout

Begin with uploaded or read-only data and historical replay. Release a planning-only simulator for unsupported accounts. Enable account forecasts only for validated segments. Run prospective shadow predictions with information cutoffs before reviewing later outcomes. Promote model updates only after held-out gains and a rollback check.

For later automation, PRD 04 supplies independent approval, spending controls and prospective policy evaluation. A simulator score alone never authorizes a live campaign change.

<!-- PAGE -->

## Page 07 Delivery sequence and responsibilities

**Weeks 1–2:** the platform engineer implements tenant identity, metric ingestion, snapshots and the shared decision ledger. The applied scientist defines conversion maturity, baseline models and temporal evaluation splits. The operator validates goals and historical account changes.

**Weeks 3–5:** build the scenario editor, first numerical model and explanation workflow. Connect approved creative versions from PRD 03. Deliver a read-only forecast brief and replay report before introducing advertising writes.

**Weeks 6–8:** complete shadow predictions, source lineage, client reporting and experiment-draft handoff. **Weeks 9–12:** calibrate with mature results from PRD 04 when traffic supports a valid test. This is a planning estimate for the team described in the repository README; traffic and provider access govern elapsed time.

## Product design

Use Hellyeah Orange #FF4301 for the active scenario and primary action, Navy #0D0C2B for navigation and baseline comparisons, Black #0D0D0D for text, Gray #F4F4F4 for supporting surfaces and White #FFFFFF for the main canvas [S1]. Avoid a wall of orange charts.

Use Lastik Regular for display headings and GeneralSans for controls and body copy. Preserve the supplied logo. Use black text on an orange button when normal-size white text fails contrast. Pair status colors with explicit labels, support keyboard operation and provide reduced motion. Targets are WCAG 2.2 AA, readable numeric labels and an accessible comparison table.

## Dependencies and decisions before implementation

Confirm the first advertiser, the goal and attribution definition, Hellyeah managed-account service access, data coverage, reporting currency and the source of conversion value. Agree on the supported horizon and segment usefulness bounds with the operator. These are pilot configuration decisions; their absence does not block a fixture-based prototype.

Defer cross-channel media mix optimization, user-level identity graphs, a full auction emulator and unconstrained autonomous spending. Add a second channel only after the initial measurement, forecast and test loop can be audited end to end.

## Primary sources

[S1] Hellyeah brand colors and typography — https://www.hellyeahai.com/brand

[S2] Mastra workflows — https://mastra.ai/docs/workflows/overview

[S3] Mastra suspend and resume — https://mastra.ai/docs/workflows/suspend-and-resume

[S4] Mastra evaluations — https://mastra.ai/docs/evals/overview

Sources checked October 18, 2026. Architecture, fidelity levels, staffing and acceptance thresholds are proposed requirements for hell_yeah2.

<!-- PAGE -->

## Page 08 Hellyeah compatibility and planning boundaries

This module extends the existing Campaign Agent draft and forecast surface. It consumes the active organization's corrected Brand Profile, managed-account campaign data, selected Studio Creative Set, schedule, maximum spend and tracker health. It does not ask the advertiser to connect an independently owned Google Ads account. Internal joint-team access supplies the managed-account data through the OS adapters.

Search keywords are a priced, read-only set in Hellyeah's current flow. The simulator can explore a clearly labeled hypothetical sensitivity, but an executable revision must request a supported Campaign Agent strategy/repricing result. Freeze that new draft version before forecasting it. Geography, schedule, copy and budget changes still run the existing readiness validation.

Support impression and conversion goals explicitly. With an impression goal, forecast supported delivery metrics and distinguish reach from impressions. Reach requires a defensible unique-audience model or source estimate; do not derive it by simply counting impressions. With a conversion goal, require X-Ray to be connected and receiving events for submission, and require an appropriate conversion definition before making calibrated outcome claims.

The current product also supports Performance Max. Preserve its existing availability, creative readiness and managed-account flow. The first validated numerical model can be Search-only; PMax receives descriptive history and labeled sensitivity/planning mode until a distinct validation cohort passes. Do not apply Search calibration to PMax or prevent an existing valid PMax launch because the new model is unavailable.

Forecast cost, Wallet maximum reservation and realized ad-platform spend remain separate values. Never describe a forecast as an approved amount or new Wallet balance. A client choosing a scenario still uses the existing launch/review path.

**Compatibility tests:** missing profile resumes through Brand; a conversion plan with disabled tracking cannot submit; an impression plan remains available; read-only keywords stay read-only; a submitted creative snapshot stays fixed after Studio edits.

<!-- PAGE -->

## Page 09 Numerical execution contract and worked case

The numerical interface accepts a validated snapshot, scenario versions, model artifact, deterministic seed, draw count and runtime version. Return stored distributions and diagnostics; agents receive a read-only numerical result. Validate finite values, nonnegative counts/costs, explicit currency, horizon bounds and model support before execution.

For an illustrative fixture, a 28-day managed Search snapshot contains 20,000 impressions, 1,000 clicks, USD 1,000 cost and 40 mature qualified leads. These describe historical delivery: CTR is 5 percent, CPC is USD 1 and observed CPA is USD 25. They do not establish that a future USD 2,000 budget would buy 80 leads. The fixture simulator scales only its declared assumption exercise and labels results uncalibrated.

A production baseline fits conversion uncertainty from actual counts and maturity. A budget candidate requests demand/capacity support. A creative treatment starts with an explicit uncertain effect assumption unless prior valid tests support one. Simulate possible future outcomes over the registered horizon, including zero outcomes. Return expectation, median, central intervals, target probability and diagnostics without discarding unfavorable draws.

Use canonical scenario hashes to reuse exactly identical calculations. Do not reuse an output when any source version, horizon, assumption, seed, numerical code, calibration policy or model artifact changes. Store full draw references where needed for reproducible downstream comparisons and retain summary precision before formatting for display.

**Required numerical failure cases:** zero spend; zero clicks; zero conversions; attributed fractional conversions; missing value; extreme CPC; sparse history; model support violation; changing currency; and a conversion window longer than the forecast horizon. Use an appropriate likelihood or descriptive mode for fractional outcomes rather than an integer binomial shortcut.

**Acceptance:** the worked fixture reconciles historical arithmetic, an identical seed reproduces output, and the production implementation cannot mistake an assumption exercise for an experimentally validated response model.

<!-- PAGE -->

## Page 10 Integration APIs and agent implementation tasks

The earlier `/v1` paths are proposed hell_yeah2 module APIs. They are not claimed Hellyeah public endpoints. Expose them inside the joint application or map them to its established internal transport. Public documentation does not define general managed-account reporting endpoints; obtain those bindings from shared service types.

| Task | Implementation output | Verification |
| --- | --- | --- |
| SIM BUILD 01 | Snapshot normalizer and metric dictionary | Unit/currency/timezone and conversion-maturity cases |
| SIM BUILD 02 | Scenario validator and immutable hash | Unsupported action and stale-input rejection |
| SIM BUILD 03 | Numerical worker and artifact registry | Reproducibility, zero-outcome and bounded-resource tests |
| SIM BUILD 04 | Temporal validation runner | Frozen baseline comparison and segment calibration |
| SIM BUILD 05 | Mastra explanation tool | Numeric consistency and source-reference checks |
| SIM BUILD 06 | Campaign draft panel and client report | Existing flow, access and stale-state checks |
| SIM BUILD 07 | Experiment draft handoff | All IDs, objective, versions and effect assumptions retained |

Implement domain functions before agents. In Mastra, define input/output schemas for each tool and require an organization-scoped request context from the authenticated caller. The model cannot replace that context with a value from a document. An invalid tool call returns structured error information and no result artifact.

A module response has status, run_id, organization_id, scenario_version, fidelity_level and either a ForecastBundle reference or a structured failure/repair path. Asynchronous work provides queue/running/failed/cancelled states. Do not stream provisional monetary numbers that can later be confused with the final immutable result.

**Acceptance:** a fixture consumer and a certified internal-service consumer run the same domain tests. UI and agent clients both read the same result object, so a chat explanation and a comparison chart cannot silently report different forecasts.

<!-- PAGE -->

## Page 11 Monitoring drift and learning operations

Monitor data and forecast quality separately. Data alarms include missing reports, unusual cost/count revisions, changed campaign setup, altered attribution settings and tracker inactivity. Model alarms include coverage deterioration, worsening proper scores, support violations and frequent operator corrections. A healthy worker does not imply a healthy forecast.

Freeze shadow predictions at their information cutoff and compare them with outcomes only after the declared maturity window. Keep original predictions even when a later source correction changes the outcome label. A new corrected evaluation dataset version references the original so investigators can separate data revision from model error.

Use a champion/challenger registry. A candidate records feature schema, training range, permitted segments, consent basis, evaluation dataset, code version, parameter artifact and known limitations. Promotion requires the specified held-out gates and a reviewed rollback. Do not automatically promote on each new dollar or each completed test.

When a source shift invalidates a segment, downgrade it to planning/descriptive mode or abstain while preserving usable segments. Notify the OS with a typed capability change. Existing report snapshots remain available with their original context, while new decisions see the degraded current status. Do not silently rewrite prior confidence labels to improve the historical score.

Inference cost includes fitting, simulation, explanation, retry and human review. Report cost per supported decision as well as latency. Cache immutable results and prefer precomputed model artifacts when appropriate. Queue large batches instead of blocking the campaign detail page.

**Operational drill:** remove the current model artifact, restart a numerical worker mid-job, revoke source access and change the metric definition. In each case the simulator retains a recoverable state, stops unsupported recommendations, communicates the exact limitation and prevents stale outputs from authorizing a new action.

<!-- PAGE -->

## Page 12 Local substitution and module definition of done

Use the OS fixture organization's managed campaign, Brand Profile, Studio selection, tracker and Wallet projection. The runnable reference demonstrates transport-independent normalization, seeded assumption simulation, plan hashing and evidence handoff. Production fitting, calibration and UI remain implementation work described by the backlog; fixture success is not numerical validation.

Live substitution binds CampaignPort, BrandPort, StudioPort, XRayPort and metric extraction to Hellyeah's existing services. Replace IDs and service transport through configuration and typed adapters, not scattered string replacements. Record source schema/version and adapter certification. Keep the numerical domain interface unchanged unless a reviewed schema migration is required.

| Completion layer | Required evidence |
| --- | --- |
| Specification | Twelve substantive page sections; consistent shared contracts and source links |
| Local reference | Deterministic run and negative contract tests with no network calls |
| Joint staging | Internal data matches known managed campaign/source totals and versions |
| Product implementation | Accessible editor, durable jobs, report access and complete failure states |
| Validated forecasting | Frozen temporal evaluation and prospective shadow comparison |
| Policy use | Separate OS/Experimentation approval and prospective decision-value evidence |

No new purchase, top-up or extra advertiser OAuth flow belongs in this module. If a source capability is not implemented, return a declared unsupported status and continue useful supported planning. The joint-build assumption permits implementing the missing internal bridge; it does not permit calling a guessed public URL.

Relevant compatibility sources are [Campaigns](https://docs.hellyeahai.com/campaigns), [Managed ad accounts](https://docs.hellyeahai.com/managed-ad-accounts), [Studio](https://docs.hellyeahai.com/creatives), [X-Ray](https://docs.hellyeahai.com/tracking/api-reference) and [Wallet](https://docs.hellyeahai.com/wallet), checked October 18, 2026. Read the OS PRD for authoritative ownership, adapter substitution and approval rules.

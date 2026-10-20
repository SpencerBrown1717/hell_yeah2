---
id: HY-OS
title: Autonomous Growth OS
version: 2.0.0
repository: hell_yeah2
status: implementation_ready_specification
document_pages: 20
pagination: explicit_numbered_sections
primary_framework: Mastra
integration_model: joint_build_inside_hellyeah_flow
default_adapter: fixture
money_authority: hellyeah_wallet_and_launch_services
companions:
  - 02-campaign-simulator.md
  - 03-creative-intelligence.md
  - 04-experimentation-platform.md
---

# Autonomous Growth OS

## Page 01 Product mandate and intended result

Build the intelligence and operating layer that helps Hellyeah decide what to run, what to test, when to change it and why. Integrate directly with the existing organization, Brand Profile, Campaign Agent, Studio, Wallet, review, managed-ad-account and X-Ray flow. The three companion products are modules of this OS: Campaign Simulator, Creative Intelligence Engine and Experimentation Platform.

An operator should be able to start with a business goal, review a researched plan, inspect forecast ranges, approve a precise spending envelope, follow campaign delivery and receive an evidence-backed next decision. The client sees an understandable record of the same work. A platform engineer maintains dependable tools and services; decision models choose among allowed actions using measurable objectives and explicit uncertainty.

The objective is improvement in business outcomes for an agreed amount of money and operational effort. A growing dataset is useful only when it produces better validated decisions. The OS therefore captures the information available at decision time, the alternatives considered, what actually ran, mature outcomes and contradictory evidence. Improvements must survive held-out evaluation and prospective testing.

Treat this as a joint build with Hellyeah and assume access to its code, internal services, managed accounts, approved model providers, staging environment and technical owners. Local development uses deterministic adapters with the same logical contracts. Missing credentials do not block development. Live endpoint details are binding configuration to obtain from their source, not invented public APIs.

The deliverable specified here is a complete operational product. The bundled reference harness is an executable local contract example; it is not a production ad platform or proof of campaign performance. All acceptance thresholds in these PRDs are proposed engineering and evaluation gates.

**Requirement OS 001:** one organization can complete the entire fixture journey without a network service, payment or model key. **Requirement OS 002:** the live path preserves Hellyeah's existing authoritative systems and visible product rules.

<!-- PAGE -->

## Page 02 Compatibility with the existing customer journey

The documented journey starts with business research and a corrected Brand Profile, continues through campaign and Studio preparation, verifies tracking for conversion goals, then reserves approved Wallet funds and enters review before Google setup. The OS adds intelligence at those decision points rather than introducing a separate onboarding or spending product [H1, H2].

| Existing surface | OS addition | Authority retained |
| --- | --- | --- |
| Organization switcher | Context pinning for every workflow and report | Existing organization identity and membership |
| Brand Profile | Versioned facts, evidence and research changes | Saved profile and explicit edits |
| Campaign Agent draft | Candidate plans, scenario comparison and test hypotheses | Existing editable campaign draft |
| Studio | Source-linked creative dossiers and test briefs | Creative Sets, candidate choice and campaign snapshots |
| Launch readiness | Additional forecast and experiment validity checks | Existing readiness rail and launch service |
| Wallet | Budget-policy projection and exposure reporting | Existing balance, reservations, spend and refunds |
| Review and managed accounts | Review context and reconciled intent state | Existing review and Google setup |
| X-Ray and Overview | Measurement quality, experiments and learning | Existing tracker and reporting services |

Support both impression and conversion goals. Missing X-Ray blocks conversion submission; it does not block an impression draft or a clearly labeled awareness plan. Preserve the requested goal instead of silently changing a conversion goal to impressions. A missing Brand Profile returns the user to the existing repair path and then resumes the original draft context.

Keep submitted campaign configuration and creative snapshots immutable. A new profile or Studio edit informs later drafts, not the campaign already approved. Search keyword choices remain read-only in the operator UI. A proposed keyword revision invokes supported Campaign Agent repricing and a new reviewed draft; it cannot directly mutate a priced set.

**Acceptance:** replay the documented journey with the OS enabled and disabled. The same organization, draft, maximum spend, review state and tracker gate must agree in both paths.

<!-- PAGE -->

## Page 03 Users and decision rights

The product serves owners accountable for money, operators accountable for campaign work, reviewers accountable for permitted content and scientists accountable for evidence. These responsibilities can belong to the same person in a small organization, but the access checks remain explicit.

Map existing Hellyeah owner/member identities from the source system. Do not assume those two public roles define every internal financial permission. Define scoped capabilities such as view_evidence, edit_draft, register_experiment, approve_launch, review_content and manage_policy. Bind them to the existing authorization service during integration. Client read access is a proposed OS capability, not a claim about an existing Hellyeah role.

| Actor | Normal work | Restricted action |
| --- | --- | --- |
| Client owner | Review plan, business goal and money envelope | Must explicitly authorize new spending scope |
| Growth operator | Research, propose plans, diagnose performance and draft tests | Cannot exceed granted organization/account scope |
| Creative reviewer | Correct observations and approve proposed assets | Cannot replace an approved live snapshot silently |
| Platform operator | Reconcile jobs, monitor health and stop new actions | Cannot alter final outcomes to improve reported performance |
| Applied scientist | Validate forecasts, experiments and policy candidates | Cannot promote a policy solely on training results |
| Mastra agent | Retrieve evidence and propose typed decisions | Cannot supply its own authority or directly move money |

The local reference has simulated approvals for testability. A fixture approval is never accepted by a live adapter. Live grants carry source identity, resource scope, a canonical plan hash, approved operations, limits, expiry and revocation state. An organization switch invalidates an open review if its bound context no longer matches.

When a user requests an unavailable action, show the missing capability and preserve the draft. Do not compensate by using another organization's account or a broadly privileged service token. All operator overrides record actor, reason, version and subsequent outcome.

**Acceptance:** test a member without launch permission, an owner with a stale grant, a client viewer requesting a write and an agent attempting to widen its scope. Each receives an explicit denial while authorized read work continues.

<!-- PAGE -->

## Page 04 Product modules and ownership boundaries

The OS owns the control loop, shared records, policy enforcement, schedule, observability and client narrative. The three companion PRDs own deeper specialized behavior. Avoid duplicating their numerical models or capture logic inside the OS agent prompt.

**Campaign Simulator** consumes an immutable campaign/metric snapshot and explicit assumptions. It returns conditional outcome distributions, support flags and calibration evidence. It cannot approve a launch. **Creative Intelligence** consumes approved sources and exact Studio/campaign versions. It returns observations, reviewed interpretations and testable hypotheses. It cannot invent performance. **Experimentation** registers plans, controls measurement and coordinates approved execution. It returns mature result bundles and validity diagnostics.

| Module output | OS consumer | Next action |
| --- | --- | --- |
| CreativeFeatures and HypothesisSpec | Candidate planner | Request a supported simulation or feasibility check |
| ForecastBundle | Decision policy | Compare downside, constraints and uncertainty |
| ExperimentPlan | Review coordinator | Present exact versions, metric and spending envelope |
| ApprovalGrant | Execution gateway | Submit only the frozen authorized intent |
| Execution readback | Monitor | Follow actual lifecycle and reporting freshness |
| ResultBundle | Learning coordinator | Build evaluated model and policy candidates |

Use one shared organization envelope and one artifact/version namespace. A module may be temporarily unavailable without corrupting the rest: a missing creative dossier does not fabricate an observation; an unsupported forecast leaves the operator with a clear test hypothesis; inconclusive experiments do not become winners in the OS summary.

Prefer one repository and a modular monolith with a web/API deployable, Mastra workers, isolated capture workers and numerical workers. Split services further only for a measured security, scaling or ownership need. State is persisted in shared contracts, not hidden in one agent conversation.

**Acceptance:** a contract change in one module either passes the versioned consumer tests or is rejected before publication. The OS never merges a new schema by parsing free-form prose.

<!-- PAGE -->

## Page 05 Objective and decision policy

Each organization defines the outcome, reporting horizon, currency, conversion event, attribution basis and business threshold. For a sales business with reliable value and margin data, evaluate contribution after ad cost. Without that data, use the registered qualified-conversion or revenue-value metric and state its limitation. Do not optimize a convenient proxy while reporting it as the client's business objective.

Build a finite candidate set from supported actions: retain the incumbent, prepare a revised draft, test an approved creative or landing page, change an allowed budget within policy, or pause a deteriorating campaign. Candidate availability depends on campaign state, channel support, sufficient evidence, Wallet context and delegated authority. The incumbent remains an explicit option.

The initial policy is deterministic and auditable: remove disallowed candidates; remove unsupported numerical claims; compare expected outcome and downside against predeclared thresholds; recommend the best eligible action or request an experiment when uncertainty dominates. Store all rejected candidates and reason codes. A model explanation may clarify a decision but may not replace these checks.

For bounded automation, the approved policy states action types, accounts, cumulative exposure, maximum change size, minimum evidence, expiry, data-freshness limits and stop conditions. It may autonomously execute only operations that Hellyeah's integrated permission and review systems explicitly support. Existing launch confirmations remain in force until Hellyeah implements and approves a delegation contract.

Never count a budget reservation as spend, gross revenue as margin, a model-predicted lift as measured lift or an observational association as experimental effect. Log a no-action decision when no candidate is justified. This provides a meaningful evaluation baseline and prevents the system from changing campaigns merely to appear active.

**Acceptance:** given the same frozen context, policy version and numerical outputs, the policy produces the same candidate eligibility and choice. Model wording can vary without changing authorized operations or computed amounts.

<!-- PAGE -->

## Page 06 Campaign lifecycle and orchestration state

Maintain three related but separate state machines: the Hellyeah campaign lifecycle, the OS workflow lifecycle and the experiment lifecycle. Their states are not interchangeable. A workflow completing an API submission does not mean the campaign serves; a completed experiment analysis does not imply campaign completion.

The campaign projection preserves Draft, In Review, Launching, Serving, Paused, Completed, Rejected, Cancelled and Failed. Store source state, source version, observed_at and the latest confirmed resource. OS workflows use queued, running, awaiting_input, awaiting_approval, reconciling, completed, failed and cancelled. Experiment states are specified in PRD 04.

| Trigger | OS transition | Required confirmation |
| --- | --- | --- |
| Goal submitted | Queue research and planning | Organization and Brand Profile version |
| Draft revised | Invalidate affected outputs | New canonical draft hash |
| Approval granted | Queue execution intent | Grant matches exact plan and expiry |
| Launch response uncertain | Enter reconciling | Source campaign/reservation readback |
| Source review passes | Observe Launching | Existing review authority |
| Source reports serving | Enable delivery monitoring | Managed campaign readback |
| Pause requested | Block new related mutations | Pause confirmation remains separate |
| Outcome window matures | Queue analysis | Registered maturity and metric version |

Use optimistic version checks at transitions and compare-and-set updates. A late callback cannot revive a cancelled plan, duplicate a reservation or apply an outdated approval. Record unexpected source transitions and repair them through reconciliation rather than editing history.

Schedule work with durable jobs and an outbox committed alongside state. Persist checkpoints before expensive external work. A cancelled job retains its artifacts for audit under policy, but cannot publish a current recommendation. Any in-flight external side effect must still reconcile after local cancellation.

**Acceptance:** exercise launch timeout, review rejection, delayed serving, pause timeout, cancellation before setup and late spend. The UI and ledger show confirmed state separately from requested state, with the correct next repair action.

<!-- PAGE -->

## Page 07 Mastra implementation

Use Mastra as the TypeScript agent/workflow layer. Pin exact dependency versions in the implementation lockfile. Its documented typed workflow, persistent suspension and evaluation facilities support the design [M1–M3]. Verify the selected release's signatures against installed docs; do not invent a historical API or rely on an unpinned latest dependency in production.

Define bounded agents for brand research, creative research, experiment planning and explanation. Agents retrieve organization-scoped evidence and return schema-validated proposals. Numerical computation, allocation, spending checks and source authorization are ordinary deterministic tools/services. Agents cannot request unrestricted SQL, arbitrary shell execution or arbitrary advertising mutations.

| Workflow | Inputs | Persisted output |
| --- | --- | --- |
| growthCycle | Organization, goal, BrandSnapshot, metric cutoff | DecisionRecord plus next authorized work |
| researchCreative | Approved sources and CreativeSet snapshots | Reviewed evidence and HypothesisSpec |
| simulateCampaign | ScenarioSpec, snapshot and model version | ForecastBundle |
| designExperiment | Hypothesis, metric and feasibility context | Frozen ExperimentPlan |
| reviewAndSubmit | Plan hash and authenticated review callback | ExecutionIntent and source operation refs |
| reconcileDelivery | Operation refs and expected state | Confirmed source projection |
| concludeAndLearn | Mature metrics and registered analysis | ResultBundle and evaluation candidate |

Keep large artifacts in object storage and state references in Mastra snapshots. Persist storage on a supported shared provider and separate observability workload where required. Use durable scheduled workers for wakeups; never assume a JavaScript timer survives deployment.

Suspension is coordination, not authorization. The review callback checks current identity, scope, version and revocation in the application before resuming. Every tool independently enforces organization context. A forged resume payload saying approved cannot create an ApprovalGrant.

The offline reference intentionally tests deterministic contracts without calling an LLM. Live Mastra agents wrap those tools after provider/model binding. Their schema tests, reference numerical outputs and permission denials must remain identical in meaning. A fluent model cannot bypass a failing deterministic result.

<!-- PAGE -->

## Page 08 Integration ports and live adapter binding

Define logical interfaces in the repository, not fictional Hellyeah REST endpoints. Each port gets a fixture implementation and a live implementation bound to source code/internal service definitions during the joint build. The user assumption of access permits that binding; it does not reveal undocumented request fields.

| Port | Required methods | Source of live authority |
| --- | --- | --- |
| IdentityPort | resolveOrganization, capabilities | Existing identity and membership service |
| BrandPort | getVersion, proposeRevision | Existing Brand Profile service |
| StudioPort | getSet, getCandidates, snapshotSelection | Studio and submitted creative snapshots |
| CampaignPort | getDraft, validateReadiness, submit, getState, requestPause | Existing campaign/review/managed-account orchestration |
| WalletPort | getProjection, getReservation, reconcile | Existing Wallet ledger and reservations |
| XRayPort | getTrackerHealth, readEvents, readAggregates | Internal protected X-Ray services |
| ReviewPort | requestReview, readDecision | Existing review pipeline plus OS policy approval |
| EvidencePort | putArtifact, scopedRead | Agreed private object storage |

Capture the installed CLI version and nested help before any CLI fallback. The documented CLI supports organization/profile/campaign/creative/wallet/tracker concepts and structured output, but coverage varies. Use an argument-array invocation and an allowlist. Do not guess money-command flags, scrape human text for authority or treat `--yes` on skill installation as launch permission [H8].

Public X-Ray collection is an ingestion boundary, not a reporting API. The docs expose collection/configuration methods; protected reporting APIs are reserved for Hellyeah services [H5]. Implement authenticated reads through the joint internal port, never by inventing public export endpoints or assuming a 200 collect response proves storage.

Every adapter returns normalized data and the original source IDs/version. Unknown required fields fail with adapter_contract_mismatch. Optional capability flags disable the affected function explicitly. A live adapter never falls back silently to fixture data.

<!-- PAGE -->

## Page 09 Canonical records and schema ownership

All records use `schema_version`, `organization_id`, `record_id`, `created_at`, source references and a trace/run identifier. `tenant_id` in companion algorithms maps one-to-one to `organization_id`; the boundary adapter performs and validates that mapping. Do not maintain two independent business identities.

Use UTC event timestamps and retain reporting timezone. Preserve source currency and scale. Canonical money uses integer micros; JSON serializes large values as validated decimal strings when JavaScript precision could be exceeded. Convert X-Ray decimal revenue exactly once with a currency-aware routine; never multiply an already converted micros value again.

| Record | Owner | Key invariant |
| --- | --- | --- |
| BrandSnapshot | OS/Brand adapter | Exact source profile version and facts |
| CreativeVersion | Creative Intelligence | Exact candidate and campaign snapshot mapping |
| MetricSnapshot | Measurement module | Cutoff, attribution and maturity frozen |
| HypothesisSpec | Creative/Experiment modules | Falsifiable proposed change with sources |
| ScenarioSpec and ForecastBundle | Simulator | Reproducible conditional calculation |
| ExperimentPlan and ResultBundle | Experimentation | Registered design and versioned analysis |
| ApprovalGrant and ExecutionIntent | OS gateway | Exact authority and source reconciliation |
| WalletProjection | Wallet adapter | Read projection; source ledger remains authoritative |
| DecisionRecord | OS | Alternatives, chosen action and mature outcome linked |

Immutable objects receive a canonical content hash after field validation and deterministic serialization. A material change produces a new version and invalidates dependent approval. Append corrections rather than editing historical inputs in place.

Database foreign keys include organization context where possible. Object paths and vector retrieval namespaces include organization scope and enforce server-side authorization. An opaque record ID alone is never sufficient access. Schema migrations carry backward/forward compatibility tests, a rollout plan and a reproducible downgrade or repair path.

**Acceptance:** change a Brand Profile, a creative candidate and a conversion definition independently. The existing submitted campaign remains linked to its original versions; affected future forecasts/tests become stale in a predictable, explainable way.

<!-- PAGE -->

## Page 10 Measurement and X Ray integration

Use X-Ray as Hellyeah's first-party website outcome source, retaining ad-platform delivery metrics separately. Track health includes configured, enabled, receiving events, last_event_at and source freshness. A public collection response alone is insufficient: disabled trackers can acknowledge while dropping data [H5]. Verify accepted internal events and dashboard/report visibility through the internal port.

Map the documented typed conversions, including `cv_purchase` and `cv_lead_submit`, into the registered metric dictionary. Keep custom events secondary unless explicitly designated as the business outcome. Preserve currency, revenue meaning, event time, received time, source event ID and conversion-definition version [H6].

Deduplicate client/server/Shopify purchase signals with an agreed business event key or source reconciliation, not a guess based only on timestamp and amount. If no reliable deduplication key exists, mark revenue measurement unsuitable for automated value optimization until repaired. Preserve session and visitor semantics; platform conversion rates and experimental per-assigned-unit rates can have different denominators and must be labeled.

Publicly collected events are untrusted input. Validate hostname/website associations, schemas, rate/abuse signals and internal verification status before using them as evidence for money decisions. Do not train a policy directly on arbitrary forged event names. Delay/settlement rules must distinguish live delivery updates, website conversions and final ad-platform spend.

Store attribution windows and source matching rules explicitly. Never add X-Ray and Google conversions as if they were disjoint outcomes. Publish a reconciliation view that explains measurement source, matching status, duplicates, modeled/fractional quantities and unavailable outcomes.

**Acceptance:** a verified conversion event reaches its organization, the intended metric and an analysis snapshot once. A duplicate transport message does not double revenue. An impression campaign without tracking remains usable for delivery analysis, while the OS withholds conversion claims and conversion-goal launch readiness.

<!-- PAGE -->

## Page 11 Wallet and spending authority

Hellyeah's prepaid organization Wallet remains the financial source of truth. The OS reads balance, reservations, reported spend and refund states and adds policy/exposure projections. It does not create a second customer balance, charge Stripe, mint available funds or release reservations independently [H4].

Submitting an approved campaign uses the existing reservation and review transaction. Approval/review cannot reserve the same maximum twice. Maintain the source reservation reference and an execution-intent deduplication key. When a submission times out, reconcile campaign and reservation state before retrying. A new local transaction cannot guarantee exactly-once effects in another service.

The OS may reserve decision-policy exposure in its own control ledger to prevent concurrent proposals exceeding a delegated limit. That is a nonfinancial limit reservation, visibly distinct from Wallet funds. Release it only after reconciliation shows the corresponding intent cannot still execute. Compare it against the authoritative Wallet projection at execution time.

Cancellation and settlement use existing Hellyeah behavior. Funds for a campaign that may have served remain subject to the documented settlement process; pending refunds are unavailable for new work. A pause request does not itself create a refund. Preserve final spend corrections and source transaction links [H7].

Budget controls combine approved maximum, observed spend, outstanding exposure, reporting freshness, uncertainty buffer and provider state. Ad platforms can report late and use budget pacing rules. A local alert cannot promise an exact real-time final-spend ceiling. Prefer provider-side constraints and early intervention, and disclose unresolved exposure.

**Acceptance:** two concurrent intents cannot consume the same policy envelope unnoticed; an ambiguous source response enters reconciliation; review rejection returns the correct source refund state; a late spend correction changes the projection without rewriting the approved plan. Test no double reservation and no spending of pending refunds.

<!-- PAGE -->

## Page 12 Creative and simulator decision handoff

The OS requests reviewed creative evidence from exact Studio Creative Sets and campaign snapshots. Record messaging angle, source Brand Profile, candidate selection, copy and eligible landscape/square variants. Search can proceed when required text is ready even if unrelated image generation continues. Performance Max retains its final required image selections and full launch checks [H3].

Build candidate plans from supported editable campaign fields and internal services. Preserve Search's read-only priced keywords. A hypothetical keyword sensitivity may be shown as an unsupported assumption; an actionable keyword plan requires a new Campaign Agent/repricing result and a fresh readiness/approval cycle. The simulator cannot price an unsupported mutation into apparent authority.

The simulation request includes goal, horizon, source metric cutoff, current campaign version, candidate action, constraints, user assumptions and supported-market flags. A response includes distributions, zero-conversion probability, calibration and unsupported changes. The OS checks currencies and objective definitions before comparison.

Evidence strength controls what the OS says. An observed creative pattern can justify a hypothesis. An account association can suggest prioritization. An experiment can support a causal effect within its population and conditions. A forecast is conditional on inputs and support; it is not proof that a creative caused a lift.

The client review presents the existing campaign draft plus a comparison panel: expected range, plausible downside, assumptions, evidence and proposed next test. The final button remains the applicable Hellyeah action. Forecast success cannot skip Wallet, tracker, content or ad-account readiness.

**Acceptance:** a creative edit creates a new version; the old forecast becomes stale; a selected scenario creates a test draft with matching identifiers; review sees the exact artifact that will run. An unsupported Performance Max forecast shows descriptive/sensitivity output rather than reusing Search calibration or falsely blocking the underlying existing product.

<!-- PAGE -->

## Page 13 Experimentation and continuous learning

Use the Experimentation Platform to register the actual question before spending. A plan specifies population, unit, allocation, primary metric, practical effect threshold, analysis, maturity and validity guards. First-party landing-page tests use owned assignment records. Managed Search tests use Hellyeah's supported internal/native experiment capabilities and preserve provider semantics.

The OS cannot manufacture randomized evidence from two campaign totals. When available source statistics do not support a defensible causal analysis, label the result descriptive and route it to an analyst. Controlled tests and predictive backtests answer different questions and are retained separately.

Each decision retains available context, all eligible candidates, selected action, selection policy, original prediction, exact execution, budget/spend and mature result. Include rejected, harmful, null and invalid tests. Operator overrides are learning context, not labels that automatically prove the operator was correct.

Build model candidates from frozen versioned datasets with information cutoffs. Evaluate forecasts on temporal holdouts and policies prospectively against an incumbent. Cross-organization pooling requires explicit consent and validation of transport assumptions. Avoid leakage from future conversions, later screenshots or repeated test selection.

Policy improvements progress through offline evaluation, shadow recommendations, approved canary actions and a controlled comparison. Keep a stable holdout for adaptive methods. An adaptive budget allocator requires logged nonzero action probabilities and separate valid analysis; deterministic historical choices do not prove the value of untried actions.

The product reports learning progress with calibration, decision coverage, realized effect under valid designs and operating cost. It must also show deterioration and periods with insufficient evidence. A promise to get smarter with every dollar becomes a measurable engineering objective, not an unconditional guarantee.

**Acceptance:** the OS can reconstruct why an action was chosen using only the information available then; replay an analysis after late outcomes; reject a leaked training feature; and decline promotion when the candidate has no credible held-out or prospective gain.

<!-- PAGE -->

## Page 14 Client facing research and operating surfaces

Extend the existing dashboard with a Growth view and contextual panels inside Campaigns, Studio and Tracking. Provide four workspaces: Growth Overview, Simulator, Creative Intelligence and Experiments. Preserve the organization switcher and existing paths. The client should not have to reenter business facts or fund another wallet.

Growth Overview shows the current goal, campaign delivery state, verified spend/outcome freshness, proposed next action and outstanding reviews. A decision opens its evidence, uncertainty, exact proposed change and approval scope. The activity log distinguishes planned, requested, source-confirmed and measured events.

The Simulator compares scenarios and opens assumptions. Creative Intelligence displays capture evidence and reviewed research. Experiments shows design, allocation, maturity, effect and validity. Every number links to the underlying metric or result definition; every report pins a version.

Research products include a campaign planning brief, creative dossier, experiment result memo and periodic account learning review. Each states audience, time window, source cutoff, limitations, human review and the next decision. Reports can be exported under organization access controls; anonymous public sharing is not the default.

Support client comments and requested changes as separate records. Comments cannot overwrite measured outcomes or amend an approved plan. A superseding report links to the earlier version and states the corrected input or analysis. Notifications follow existing account preferences and do not send arbitrary captured content to unapproved channels.

**Acceptance:** a client viewer can trace a headline result back to an accessible immutable record. A viewer from another organization cannot open the report, image, thumbnail, source span or cached export. When tracking is stale, the overview visibly withholds fresh-performance claims and the policy stops new value-based actions.

<!-- PAGE -->

## Page 15 Color typography and accessibility

The shell uses the verified Hellyeah palette: Orange `#FF4301`, Navy `#0D0C2B`, Black `#0D0D0D`, Gray `#F4F4F4` and White `#FFFFFF`. Use the hosted supplied logo and brand typography, Lastik Regular for display and GeneralSans for interface/body text, following their documented usage [B1]. Do not reset or redraw the wordmark.

| Role | Token | Usage rule |
| --- | --- | --- |
| Primary action | Orange background and black text | One primary action per task surface |
| Navigation | Navy with white labels | Selected state also has an icon/position cue |
| Main content | White and black | Evidence and dense numeric reading |
| Supporting surface | Gray with black | Tables, chart backgrounds and secondary panels |
| Current scenario | Orange line/marker | Add label and distinguish other series with patterns |
| Uncertainty | Neutral shaded range and text | Do not use confidence as a color-only cue |

Color validation is executable. Compute normal-text contrast with the WCAG luminance algorithm. The orange/white combination is not selected for small action text; black on orange preserves contrast. Focus rings, errors, warnings, current steps and verdicts need text or shapes in addition to color.

Target WCAG 2.2 AA for implemented UI: keyboard traversal, visible focus, labeled inputs, 44-pixel preferred touch targets, reduced motion, chart tables, readable zoom and screen-reader result announcements. Avoid placing operational implementation details in the client journey.

The repository's CSS is the initial token contract. Preview and fixture products consume the same values. Client ad assets still use their own Brand Profile colors; the Hellyeah shell palette must not recolor a client's creative.

**Acceptance:** validate required text pairs, inspect desktop/mobile layouts, test long organization names and currency amounts, and verify that beneficial/inconclusive/invalid outcomes remain understandable in grayscale. A color-correct screenshot alone does not establish functional accessibility.

<!-- PAGE -->

## Page 16 Reliability security and cost controls

Use transactional state/outbox commits, leased durable workers, retry budgets, exponential backoff with jitter and dead-letter queues. Retry only classified transient failures. Persist model inputs, versions and output references. Handle provider-side long operations and partial failures explicitly.

Tenant and global kill switches block new external intents immediately. A stop request also attempts the supported provider/Hellyeah pause and continues reconciliation until confirmed or escalated. Keep spend and late events visible during incidents. Idempotency, leases and fencing protect local concurrency; only source readback confirms an external effect.

Source content, uploaded assets, web captures and model text are untrusted. Scope retrieval and tools to the pinned organization, validate schemas and prohibit page instructions from becoming execution commands. Browser capture uses isolated workers with network restrictions and no money credentials. Redact unnecessary personal data before embedding or client publication.

Use approved secret storage, short-lived scoped service identities where supported, access logging and encrypted transport/storage. Audit exports and deletion propagation through thumbnails, embeddings, reports and learning datasets. Organization deletion or membership changes use existing authorized Hellyeah flows and are outside autonomous growth actions.

Bound token, image/OCR, capture, numerical and review costs per run and organization. Cache immutable artifacts by scoped hash. Choose smaller models for extraction only when field-level evaluation supports them; use deterministic checks for numbers. An exceeded analysis budget produces a partial report or deferred work, not uncontrolled retries.

Proposed pilot targets include 99.5 percent monthly read/report availability, a five-minute or better monitor cadence for active budget-sensitive tests, explicit stale-data alarms and no unexplained duplicate financial operation. Load-test internal event throughput, job recovery and reconciliation, not merely a headline ad-spend amount.

**Acceptance:** run crash, duplicate-event, source-timeout, cross-organization, prompt-injection, access-revocation and stale-data fixtures. A successful happy path cannot compensate for a failed authority or financial-invariant test.

<!-- PAGE -->

## Page 17 Environment configuration and substitution plan

Start in `HY_ADAPTER_MODE=fixture`. Use a fixture organization, managed account, Brand Profile, Creative Set, tracker, Wallet projection and campaign flight. All fixture identities have a clear `fixture_` prefix. Public collection calls, live campaign submissions and real payments are disabled in this mode.

| Configuration | Local binding | Live substitution |
| --- | --- | --- |
| Organization context | fixture_org | Resolve existing organization and capability context |
| Campaign adapter | Deterministic state machine | Bind internal campaign/review service |
| Wallet adapter | Fixture authoritative ledger emulator | Read/call existing Wallet transaction boundary |
| Tracking adapter | Versioned event fixture | Internal authenticated X-Ray read pipeline |
| Studio adapter | Selected fixture candidates | Existing Studio/campaign snapshot API |
| Model provider | Deterministic proposal fixture | Approved provider/model IDs and pinned prompts |
| Numerical execution | Seeded local tool | Same versioned tool in durable workers |
| Evidence store | Local private fixture files | Scoped object storage and retention policy |

Treat endpoint paths, authentication audiences and event envelopes as adapter bindings. Obtain them from the shared codebase/OpenAPI/protobuf/service types during the assumed joint access. Capture a sanitized staging response and run the same contract suite. A live binding is complete only when its source types, capabilities and test results are recorded.

Live mode requires explicit configuration, a verified organization/account mapping and successful adapter certification. Reject any fixture identity, missing required binding, invalid model ID or unknown capability. Do not silently switch to a different organization or return dummy predictions when a live service fails.

The provided `.env.example` names configuration needs but contains no credentials. The current reference raises a clear error for unbound live mode. This is intentional prework discipline: replacing configuration must not make an unimplemented transport look operational.

**Acceptance:** run the local flow with no secrets, prove that fixture mode makes no network requests, and prove live mode fails before any side effect until its certified adapter exists.

<!-- PAGE -->

## Page 18 Build backlog and dependency order

Implement the smallest complete measurement/decision loop first. The simulator needs reliable history; the creative engine needs versioned evidence; experiments need valid outcomes and authority. Develop shared contracts before parallel module expansion so integrations do not drift.

| Work package | Required output | Exit evidence |
| --- | --- | --- |
| FOUNDATION | Organization envelope, versions, hashes, outbox and metrics | Isolation and snapshot tests |
| COMPATIBILITY | Ports, fixture adapters and source mapping | Existing journey replay and capability matrix |
| CREATIVE | Capture, taxonomy, review and Studio links | Source-grounding and field evaluation |
| SIMULATOR | Baseline, scenarios and calibration | Reproducible temporal holdout results |
| EXPERIMENTS | Registration, assignment, maturity and analysis | A/A, power and contamination tests |
| EXECUTION | Review binding, Wallet coordination and reconciliation | Crash and financial invariant suite |
| CLIENT | Contextual workspaces, reports and approvals | Access, color and usability checks |
| LEARNING | Versioned datasets, model/policy evaluations | Shadow comparison and controlled pilot |

A proposed 10–12 week pilot assumes platform, applied AI/full-stack and data-science capacity plus growth-operator and design review. One engineer can execute the same dependency order serially with a longer schedule. Live statistical evidence depends on traffic and outcome delay, not coding speed.

Repository acceptance for this planning stage includes four sufficiently substantive paginated Markdown specs, shared adapter contracts, fixture inputs, a runnable reference, tests, an environment template and brand-token validation. Production acceptance additionally requires the implemented UI, durable persistence, real adapters, source financial reconciliation and prospective measurement.

**Acceptance:** each work package names an owner role, input contract, output contract and test. No work package is marked complete because a model generated a plausible screenshot or because an unconnected endpoint returns 200.

<!-- PAGE -->

## Page 19 End to end acceptance and live cutover

Run a fixture scenario through business context, reviewed creative evidence, baseline simulation, experiment registration, grant validation, submission, review, serving, X-Ray outcome, analysis and next decision. Retain artifacts and the full decision record. Verify the source Wallet emulator reserves once and that the analysis consumes the intended mature metric version.

Run negative cases: missing Brand Profile; missing or disabled X-Ray for conversions; impression goal without tracking; Search keywords changed without repricing; PMax final candidates absent; insufficient available Wallet balance; duplicate submission; expired/mismatched approval; source timeout after acceptance; stale data; cancellation and late refund; cross-organization access. Every denial includes a repair path and never spends through a fallback.

| Cutover stage | Permitted behavior | Promotion evidence |
| --- | --- | --- |
| Fixture | Local deterministic flow | Contract, failure and brand checks |
| Staging | Certified internal adapters, nonproduction resources | Source schema and lifecycle parity |
| Shadow | Read real data and propose only | Forecast/data reconciliation and operator review |
| Approved canary | Single exact reviewed actions | Source reservation, review and readback correctness |
| Bounded autonomy | Only supported delegated operations | Separate policy approval and prospective value evidence |

Cutover never consists only of changing a boolean. Validate the source bindings, scopes, campaign capability, test account, data maturity, incidents and rollback. Switching adapters reuses the domain code and tests; it still requires integration verification. Preserve the incumbent flow as the rollback path.

The kill switch stops new actions while reconciliation continues. Disabling the OS must leave existing campaigns, Wallet records, Studio snapshots and X-Ray reporting usable in Hellyeah. A schema or policy rollback must retain enough history to interpret actions taken under the newer version.

**Definition of done:** all four modules exchange validated versioned records; the existing journey passes; client reports trace to sources; authority and money invariants pass; the pilot demonstrates valid measurement; no unimplemented fixture is described as live functionality.

<!-- PAGE -->

## Page 20 Technical references and agent execution rules

An implementation agent should read this OS PRD first, then the shared contracts and compatibility matrix, then the relevant module PRD. Keep organization, monetary units, IDs, state ownership and approval semantics consistent. Implement deterministic boundaries before adding open-ended reasoning. Do not replace missing source schemas with invented API routes.

### Authoritative Hellyeah references

- H1 [Product flow](https://docs.hellyeahai.com/intro/products) and [Quickstart](https://docs.hellyeahai.com/intro/quickstart).
- H2 [Campaigns](https://docs.hellyeahai.com/campaigns) and [Managed ad accounts](https://docs.hellyeahai.com/managed-ad-accounts).
- H3 [Creatives](https://docs.hellyeahai.com/creatives) and [Brand Profile](https://docs.hellyeahai.com/brand-profile).
- H4 [Wallet](https://docs.hellyeahai.com/wallet) and [Spend approvals](https://docs.hellyeahai.com/billing-safety/approvals).
- H5 [X-Ray API boundary](https://docs.hellyeahai.com/tracking/api-reference) and [Dashboard tracking](https://docs.hellyeahai.com/tracking/dashboard).
- H6 [Conversion events](https://docs.hellyeahai.com/tracking/track-events) and [SDK installation](https://docs.hellyeahai.com/tracking/install-sdk).
- H7 [Cancellations and refunds](https://docs.hellyeahai.com/billing-safety/cancellations-refunds).
- H8 [CLI reference](https://docs.hellyeahai.com/cli/reference) and [CLI launch flow](https://docs.hellyeahai.com/cli/launch-ads).
- H9 [Account and team](https://docs.hellyeahai.com/account-team) and [Integrations](https://docs.hellyeahai.com/integrations).

### Framework and brand references

- M1 [Mastra workflows](https://mastra.ai/docs/workflows/overview).
- M2 [Persistent suspension and resume](https://mastra.ai/docs/workflows/suspend-and-resume).
- M3 [Mastra evaluations](https://mastra.ai/docs/evals/overview).
- B1 [Hellyeah brand](https://www.hellyeahai.com/brand) and [machine-readable tokens](https://www.hellyeahai.com/brand-tokens.json).

Sources were checked October 18, 2026. Public documentation establishes product behavior, not all internal implementation contracts. The proposed OS interfaces, infrastructure, service targets, policies and statistical thresholds are requirements for the joint build. Legacy AIMA/WhatsApp flows are not the integration target; current Dashboard/CLI concepts are.

**Agent delivery rule:** report implemented behavior, fixture behavior, verified integration and remaining live bindings separately. Update the spec and contract tests together whenever the joint team's authoritative source types require a change.

---
id: HY-03
version: 2.0.0
repository: hell_yeah2
status: implementation_ready_specification
document_pages: 12
pagination: explicit_numbered_sections
primary_framework: Mastra
parent_prd: 01-autonomous-growth-os.md
default_adapter: fixture
---

# Creative Intelligence Engine

Product Requirements Document

hell_yeah2 | PRD 03 | Version 2.0 | October 18 2026

## Page 01 Product decision

Build an evidence workspace that captures approved ads and landing pages, extracts observable creative features, and connects exact versions to measured outcomes. Operators should leave with a defensible creative hypothesis and a ready-to-review test brief. Clients should be able to inspect the evidence behind the recommendation.

The first release covers Google Search ad copy, approved image uploads and desktop/mobile landing-page screenshots. It includes a screen-capture pipeline, structured research and organization-specific performance linkage through Hellyeah. Video, audio and broad competitor-library ingestion follow once the first workflow is reliable.

**Primary users:** growth operators and creative strategists comparing messages, offers and landing pages. **Client users:** advertisers reviewing what was observed, what remains uncertain and what the team proposes to test.



## Value and scope

Replace repeated manual research with reusable, source-linked evidence. Every claim retains its captured source, timestamp, exact region or text span, extraction version and reviewer status. An asset's appearance or the length of time it remains visible does not prove that it performs well.

The engine supplies CreativeFeatures and hypotheses to the Simulator and receives ExperimentResults from the Experimentation Platform. Learning concerns observable patterns and measured effects under stated conditions; it must preserve failed tests and contrary evidence.

<!-- PAGE -->

## Page 02 Operator journey and requirements

The operator selects a client, imports owned assets or approves source URLs, and starts a capture. The system renders supported sources, checks coverage and creates evidence-backed annotations. The operator reviews uncertain fields, compares versions and asks for a test brief tied to a specific objective.

| ID | Requirement | Acceptance behavior |
| --- | --- | --- |
| CRE 01 | Accept authorized sources | Record source type, ownership or access basis and the tenant. A source failure remains visible with a reason. |
| CRE 02 | Capture reproducibly | Save viewport, locale, timestamp, final URL, renderer version, content hash and capture completeness. |
| CRE 03 | Extract observable features | Record headline, offer, CTA, layout, imagery and message-to-page consistency, each with evidence and field confidence. |
| CRE 04 | Compare creative versions | Group exact duplicates and near duplicates without erasing version history. Display source regions side by side. |
| CRE 05 | Connect outcomes | Link a performance period to the creative version actually eligible to serve during that period; expose ambiguous attribution. |
| CRE 06 | Create research products | Publish a creative dossier, message/offer map, change history and experiment brief with source links. |
| CRE 07 | Return structured hypotheses | Export a proposed change, mechanism, alternative explanation, primary metric and evidence references to PRD 04. |

## Workspace design

Use a filterable evidence gallery beside a detail drawer. Filters include advertiser, channel, format, capture date, version, review status and evidence strength. Each asset opens a full capture with region highlights and a readable text alternative.

The detail view separates **Observed**, **Interpretation** and **Measured outcome**. A finding such as a visible shipping offer belongs in Observed. A suggestion that the offer reduces hesitation belongs in Interpretation. A conversion improvement belongs in Measured outcome only with the linked measurement context.

The primary action reads **Create test brief**. Editing a brief preserves the source evidence while producing a new brief version. Publishing creates a client-visible snapshot; later corrections link to the original. Client viewers can comment or request a revision without gaining capture administration or advertising authority.

## Useful first session

From five approved source pages or assets, produce one reviewed dossier and one testable hypothesis. Surface missing pages, unreadable text and uncertain observations before presenting a polished brief. A partly successful collection remains useful without claiming complete coverage.

<!-- PAGE -->

## Page 03 Capture and creative analysis pipeline

**Acquire.** Prefer owned uploads and official, authorized ad/account APIs. Record API version, source identifiers, observed time and permitted use. For approved public pages, fetch through an isolated browser worker with a bounded URL policy. Broad scraping, authenticated third-party sessions and access-control bypass are outside the first release.

**Render.** Capture a standard desktop viewport of 1440 by 1000 and mobile viewport of 390 by 844. Pin browser/container version, locale, timezone, device scale and capture recipe. Wait for declared page readiness with a hard timeout; record partial rendering and dynamic regions. Obtain a full-page image and a viewport image when useful. Never interact with checkout, submit forms or grant device permissions.

**Normalize.** Store a source manifest and immutable artifact hash. Remove or redact unnecessary personal data before artifacts become available to analysis or client reports. Retain redaction metadata and review status. A change in viewport or transient banner must not silently become a new creative concept.

**Extract.** Use source text and DOM evidence where permitted, OCR for text unavailable in source, and a vision model for observable visual features. Each field includes a value, source span or bounding box, confidence and extractor version. Leave unreadable prices, claims and product details unknown. Do not reconstruct them from expectation.

**Organize.** Use exact hashes for duplicates; use perceptual hashes and embeddings to propose similarity groups. Review near-duplicate merges. Track concept, asset, rendered version and placement separately so that cropping, copy edits and responsive layouts remain distinguishable.

**Analyze.** Join first-party outcomes at the finest reliable level. Compare related assets with appropriate controls for date, audience, bid strategy, placement and spend. Mark these comparisons as associations unless a valid experiment establishes an effect. For responsive search ads, asset eligibility or combinations may prevent attribution to a single headline; disclose that limitation.

## Feature taxonomy

Start with message, offer, proof, CTA, format, visual composition, landing-page match and observable friction. Use a controlled schema with an unknown value. Extracted tone and intent are interpretations, not observed customer psychology. Do not infer sensitive personal traits from pictured people or audiences.

## Research outputs

The creative dossier explains what exists and what changed. The message/offer map groups observed approaches. The test brief proposes one primary manipulation with a mechanism and falsifiable outcome. Each output identifies evidence coverage and alternative explanations. Competitor observations can suggest ideas; they never supply invented CTR, CPA or spend estimates.

<!-- PAGE -->

## Page 04 Mastra workflow design

Use a **captureAndAnalyze** workflow with typed stages for authorization, capture dispatch, artifact validation, feature extraction, field review and publication. Durable browser jobs return artifact IDs rather than putting large images in workflow state. Persist state and artifact references so worker restarts do not lose provenance.

A bounded **creativeResearchAgent** retrieves tenant-scoped evidence and proposes a structured brief. A separate deterministic validator checks source references, field types and numerical consistency. A reviewer resolves low-confidence material claims before publication. Mastra's typed tools and workflow control support this separation [S2, S3].

The **draftCreativeTest** workflow accepts reviewed evidence, an objective and eligible campaign context. It returns a HypothesisSpec with the proposed variable, comparator, expected direction, alternative explanations and success metric. It may call the Simulator for sensitivity analysis but cannot assign an invented effect size to a visual feature.

## Infrastructure boundaries

Run Playwright in isolated, disposable workers with no advertising write credentials, internal-network access or unrelated browser session. Keep OCR and media extraction in separate bounded jobs. Use PostgreSQL for manifests and typed findings, private object storage for artifacts, and the shared outbox/job system for dispatch.

Treat captured page text and images as untrusted data. Embedded instructions cannot change tool access, source scope, tenant identity or publication policy. The research agent cannot execute code taken from a page. Tool inputs are typed and authorized independently of the model's requested action.

## URL and artifact controls

Restrict protocols and source domains. Reject localhost, private/link-local ranges, cloud metadata endpoints and unsupported schemes. Validate resolved IPv4 and IPv6 destinations at connection time and after every redirect; enforce egress policy outside the browser to address DNS rebinding. Limit redirects, page size, media size, requests, execution time and downloads.

Strip credentials and tracking secrets from stored URLs. Disable unneeded downloads, popups and browser permissions. Quarantine malformed files and unsupported media. Every object read and signed URL checks tenant and role; expired access must fail consistently across original images, thumbnails and report exports.

## Failure behavior

Retry transient network and renderer failures within a fixed budget. Do not loop around bot checks, sign-in walls or permission denials. Record an explicit unsupported/blocked status and allow an owned upload as an alternative. If OCR and visual extraction disagree on a material claim, route it to review rather than choosing the more fluent output.

<!-- PAGE -->

## Page 05 Data contracts and interfaces

Reuse the shared organization, timestamp, schema-version and trace envelope from the OS PRD and numerical conventions from PRD 02. Captures and extracts are immutable; corrections create new versions linked to the superseded record.

| Record | Required information |
| --- | --- |
| SourceManifest v1 | Tenant, source type, authorization basis, canonical source ID, original/final sanitized URLs, acquired_at, access scope and capture recipe |
| CaptureArtifact v1 | Manifest ID, private object reference, content hash, viewport, renderer version, locale, completeness, redaction status and retention policy |
| CreativeVersion v1 | Concept ID, owned asset ID, content version, channel, format, eligible campaign periods and parent versions |
| CreativeFeatures v1 | Creative/capture IDs, taxonomy version, per-field values, evidence regions/spans, calibrated confidence, extractor/model/prompt version and review status |
| HypothesisSpec v1 | Objective, one primary change, control and treatment versions, mechanism, competing explanations, primary metric, source refs and operator review |
| ResearchReport v1 | Pinned evidence and brief versions, audience, access scope, coverage statement, generated_at and superseded-report reference |

**HTTP contract.** POST /v1/capture-jobs accepts authorized source references and a capture recipe; return 202 with job_id. GET /v1/capture-jobs/{id} returns per-source states. GET /v1/creatives supports tenant-scoped filters. POST /v1/creatives/{id}/reviews records field-level corrections. POST /v1/research-briefs generates a draft from reviewed evidence. POST /v1/research-briefs/{id}/experiment-drafts hands the immutable hypothesis to PRD 04.

Use idempotency keys and canonical content hashes to prevent duplicated artifacts and briefs on retries. Report partial collections explicitly. Never let a request supply another tenant's artifact reference, object path or retrieval namespace.

## Research evidence grades

Show capture completeness, extraction confidence and outcome evidence separately. A perfectly legible screenshot can still have no performance evidence. Grades include observed only, descriptive account comparison and controlled experiment. Do not collapse these into a single persuasive score.

## Performance linkage

Store outcome windows, source metric definitions, attribution settings, currency and conversion maturity with the join. A creative feature association retains its cohort, controls and uncertainty. If exact asset-level delivery cannot be established, report at ad/campaign level and mark finer attribution unavailable.

Map each tenant_id exactly to a Hellyeah organization_id. Use only organization-approved data for retrieval. Cross-client benchmarking requires explicit consent, a defined aggregation policy and adequate cohort size; it is outside the first-release default.

<!-- PAGE -->

## Page 06 Quality evaluation and release gates

The proposed pilot gates below are acceptance targets. Assemble a frozen, representative dataset before tuning prompts or extractors, and publish per-field results rather than a single overall quality score.

| Test | Proposed release gate |
| --- | --- |
| Capture completion | At least 95 percent of a frozen set of supported, accessible fixture/owned pages yield complete artifacts; classify unsupported pages separately and publish overall failure rate. |
| Extraction accuracy | On at least 200 human-annotated assets/pages, macro F1 at least 0.90 for the initial factual taxonomy. Report performance by format and field. |
| Material claims | Price, offer terms, numeric results and product claims require exact source evidence and reviewer confirmation before client publication. |
| Evidence coverage | Every published factual finding resolves to an accessible capture region or source span; missing references block publication. |
| Confidence | Low-confidence fields reliably enter review; estimate calibration against held-out labels and monitor review overturn rate. |
| Duplicate handling | Exact duplicates are recognized without cross-tenant leakage; false merges in a reviewed near-duplicate set remain below 1 percent. |
| Capture performance | 95th percentile below 60 seconds per supported URL, excluding declared queue time, on specified worker hardware. Bound work per job. |
| Security | SSRF, redirects, prompt injection, cross-tenant retrieval and unsafe-artifact fixtures fail safely; redaction tests block identified secrets and personal data. |

## Agent evaluation

Mastra scorers check output schemas, evidence grounding and whether briefs distinguish observation from inference [S4]. Include adversarial pages, unreadable text, conflicting sources, partial captures, duplicated creative and absent performance data. Human reviewers assess whether a hypothesis is specific, testable and supported.

Do not use an LLM judge as the sole truth source for OCR accuracy or source fidelity. Compare extracted facts to human labels and literal evidence. Track model and prompt versions, token/media cost, review minutes and retries per reviewed brief.

## Product measures

Measure time to a reviewed brief, source-reference coverage, field corrections, duplicate research avoided and the fraction of briefs accepted into registered tests. Measure business impact through linked experiments rather than attributing every subsequent account improvement to the engine.

## Rollout

Start with owned uploads and manually approved URLs. Release capture and review to internal operators, then client dossiers. Add performance linkage after version timestamps reconcile. Expand to additional source APIs and media only after coverage, security and extraction tests pass for that source type.

<!-- PAGE -->

## Page 07 Delivery sequence and responsibilities

**Weeks 1–2:** the platform engineer delivers the capture queue, artifact store, source policy and tenant access. The applied AI engineer defines the first extraction schema and region-linked evidence. The growth operator labels representative examples and the first useful taxonomy.

**Weeks 3–4:** implement the evidence gallery, field review, exact/near duplicate handling and source-grounded briefs. Link creative versions to campaigns and the shared metric snapshots. Release the first client dossier with clear coverage.

**Weeks 5–6:** connect hypothesis handoff to PRD 04 and supported feature references to PRD 02. Add extraction evaluations, cost reporting and retention enforcement. Video requires a later scoped pipeline for keyframes, transcript timing and media-specific evaluation.

## Product design

Use the official orange #FF4301 as the primary action and selected annotation. Navy #0D0C2B anchors navigation; black, white and gray provide the evidence canvas [S1]. Preserve neutral colors in thumbnails so the interface does not alter the creative under review.

Use Lastik Regular for display headings and GeneralSans for evidence labels and controls. The gallery must support large previews, keyboard navigation, readable zoom and text alternatives. Pair each annotation color with a numbered marker. Keep confidence, capture status and measured outcome visible as separate labels. Use black action text on orange where necessary for contrast.

## Retention and audit

Proposed defaults are 30 days for raw captures, 90 days for redacted capture images and one year for approved derived findings, subject to client agreements and source permissions. Make these policies configurable. Deletion must propagate through thumbnails, embeddings, cached reports and future training/retrieval inputs. Keep only a non-content audit tombstone where required by the agreed policy.

Published research records show source time, capture recipe, reviewer and superseding versions. Revoke access promptly when a client disconnects. Do not retain session cookies or collect unrelated personal information as research material.

## Dependencies and deferred scope

Confirm the initial approved sources, right to retain captured content, client reporting roles, asset ownership and baseline annotation set. Owned uploads allow work to begin before API approval. Defer automated creative production, personalized persuasion, sensitive-trait inference and third-party performance estimates. Generation can later use the approved brief while retaining review and experiment links.

## Primary sources

[S1] Hellyeah brand assets — https://www.hellyeahai.com/brand

[S2] Mastra agents — https://mastra.ai/docs/agents/overview

[S3] Mastra workflows — https://mastra.ai/docs/workflows/overview

[S4] Mastra evaluations — https://mastra.ai/docs/evals/overview

Sources checked October 18, 2026. The pipeline, taxonomy, retention defaults and quality thresholds are proposed requirements for hell_yeah2.

<!-- PAGE -->

## Page 08 Studio compatibility and creative version semantics

Treat Hellyeah's Studio and Creative Sets as the production asset system. Read the active organization's Brand Profile, messaging angle, creative set, generated candidates and final selection. The engine adds research and decision evidence beside these records; it does not replace Studio with a second disconnected library.

Maintain separate identifiers for a concept, a Creative Set, each generated candidate, a reviewed selection and the submitted campaign snapshot. A candidate that looks similar is not necessarily the version that served. A later Studio edit or deletion cannot rewrite an approved campaign's creative snapshot or its historical evidence.

The documented Studio workflow supplies copy and landscape/square imagery. Search requires its text while images may still be generating; Performance Max requires its selected final image variants. Apply those existing readiness semantics rather than inventing a universal all-assets-complete rule. Preserve source status and distinguish generation failure from low research confidence.

Brand Profile colors describe the advertiser's creative, whereas Hellyeah's orange/navy tokens describe the product shell. The research view displays original creative colors without tinting or restyling. Suggested briefs cite the exact profile facts used and show contradictions for review instead of silently changing the business identity.

The source documentation supports reference PNG/JPEG uploads up to its published limit. The integration adapter should read authoritative limits from the joint service and validate the selected release. New formats, video and bulk import require explicit capability support and their own evaluation; they cannot be made functional by changing a file extension.

**Compatibility acceptance:** a Search draft remains ready when text is complete and unrelated imagery still renders; a PMax draft fails its real missing-image check; changing a Studio candidate invalidates future briefs/forecasts while leaving the submitted snapshot intact.

<!-- PAGE -->

## Page 09 Evidence manifest and extraction example

For every artifact, store organization, source ID/version, capture time, final sanitized URL or upload reference, content hash, source permission, renderer recipe, coverage, redaction status and derived artifact relationships. For each finding, store the field value, exact text span or normalized image region, model/extractor version, confidence and reviewer correction history.

An illustrative owned landing page contains the visible headline “Book a product demo” and a button with the same wording. The extractor can record a demo CTA and source regions. It can propose that ad-to-page message consistency might improve completion. It cannot infer the page's conversion rate or claim an uplift without linked measurement.

If source text says one price while the screenshot shows another, preserve both observations and open a conflict. If a crop cuts off eligibility terms, the offer is incomplete. If dynamic content changes between capture and review, display the captured version and timestamp. Do not present a live page as evidence for a historical screenshot without a version match.

An evidence reference must resolve under the same organization authorization as its report. Store a stable artifact/region ID, not an expiring signed URL in the permanent brief. Generate access-controlled read URLs at request time. Redacted and original versions have distinct permissions; clients cannot recover hidden personal data from OCR text, thumbnails or embeddings.

**Extraction acceptance:** factual values exactly match annotated source material; unknown fields remain unknown; all published findings resolve to their source; a reviewer can correct one field without silently replacing unrelated findings. A screenshot with no performance join is labeled observed-only regardless of its visual quality.

The local fixture uses owned, deterministic text and region metadata so the evidence contract is runnable without a browser. Real rendering, OCR and vision models are certified separately against the same manifest and finding schemas.

<!-- PAGE -->

## Page 10 Capture infrastructure and implementation backlog

The earlier `/v1` routes describe proposed hell_yeah2 module interfaces. Connect them to Hellyeah's internal Studio and storage services during the joint build; they are not documented public Hellyeah URLs. Source permissions and organization context are checked before capture dispatch.

| Task | Deliverable | Test evidence |
| --- | --- | --- |
| CRE BUILD 01 | Studio/Brand snapshot adapter | Candidate, profile and submitted-version parity |
| CRE BUILD 02 | Isolated capture worker and manifest | Reproducible recipe, completeness and failure taxonomy |
| CRE BUILD 03 | Text/OCR/vision extractors | Frozen human-label field evaluation |
| CRE BUILD 04 | Duplicate and similarity indexes | Scoped exact hashes and reviewed merge errors |
| CRE BUILD 05 | Annotation/review interface | Region navigation, corrections and accessible text |
| CRE BUILD 06 | Mastra research/brief workflow | Grounded structured hypotheses and conflict handling |
| CRE BUILD 07 | Outcome and experiment joins | Correct historical versions and mature metric basis |

Browser workers should use short-lived job credentials to read only the approved source list and write only that run's artifacts. Block arbitrary navigation, private-network access and inherited signed-in sessions. Keep concurrency and per-domain request rates bounded. Downloads that were not approved as input are not accepted automatically as evidence.

Capture state includes queued, rendering, partial, complete, blocked, failed and cancelled. A batch retains per-source status and can produce a useful partial dossier. Publication states include draft, needs_review, reviewed, published and superseded. Distinguish those states from Studio's own generation states.

**Acceptance:** a blocked page does not trigger alternate-host evasion; a partial page cannot masquerade as a complete offer; and a duplicate job creates one versioned artifact rather than multiple inconsistent reports. The full recipe, failures and review cost remain traceable from the client brief.

<!-- PAGE -->

## Page 11 Performance research and causal discipline

Join creative versions to campaign periods through Hellyeah's internal managed-account and X-Ray services. Keep ad-platform delivery, website outcomes and provider attribution models distinct. A campaign-level result can be linked to its eligible Creative Set without pretending each headline or responsive asset independently received a randomized sample.

A descriptive comparison may show that two versions ran under different budgets, audiences or dates. List those differences and avoid declaring the creative caused the outcome. Registered experiments test a particular manipulation under a defined allocation and outcome window. Record transport limits before using that result as a prior for another market or campaign type.

Track signs of creative fatigue with supported longitudinal data, sufficient exposure and a stable measurement definition. A decline during an account change, budget increase or seasonality shock is a competing explanation. The initial engine can flag a candidate hypothesis; it should not automatically pause an asset on an unadjusted short-term comparison.

Preserve negative examples. If a predicted message advantage fails a controlled test, attach that result to the feature/hypothesis history. Do not only retain winners or let a later prompt erase a failed observation. Reports show evidence count, relevant population, tested condition, maturity and whether findings are observational or controlled.

Cross-client intelligence is a later explicitly consented aggregation mode. Define cohort privacy, minimum sample sizes and domain transfer tests before publishing benchmarks. An embedding neighbor or famous competitor is not an outcome label, and competitor creative longevity is not a spend/performance proxy.

**Acceptance:** the system can explain why two apparent winners may be confounded, preserve an invalid test without treating it as negative creative truth, and cite a controlled result only for the versions/population actually evaluated. Any model-generated numerical uplift must trace to a stored validated result or be rejected.

<!-- PAGE -->

## Page 12 Local substitution and creative module completion

The offline reference reads a fixture Brand Profile, Studio selection and owned source artifact. It extracts deterministic evidence, creates a versioned hypothesis and hands it to the Simulator and Experimentation contracts. Fixture observations and regions are labeled and cannot be uploaded as live client research by changing only an environment variable.

Live substitution binds StudioPort, BrandPort, EvidencePort, CampaignPort and XRayPort. It adds isolated browser rendering and evaluated OCR/vision providers while keeping manifest, finding and hypothesis contracts stable. The joint source code supplies transport definitions and credentials; protected X-Ray reports use internal authentication rather than public collection endpoints.

| Completion layer | Required evidence |
| --- | --- |
| Specification | Twelve substantive pages with source and contract references |
| Local reference | Source-linked fixture hypothesis and deterministic versioning |
| Capture implementation | Network isolation, redaction, per-source recovery and manifests |
| Extraction implementation | Field-level labeled evaluation and confidence review |
| Product integration | Studio/campaign snapshot parity and accessible review UI |
| Learning integration | Valid outcome joins and registered experiment feedback |

Prework includes the initial taxonomy, source classes, state definitions, region schema, duplicate policy, review criteria, cost limits and privacy propagation. Remaining source-specific transport bindings are explicit integration tasks, not reasons to postpone the deterministic domain implementation.

Consult [Creatives](https://docs.hellyeahai.com/creatives), [Brand Profile](https://docs.hellyeahai.com/brand-profile), [Managed ad accounts](https://docs.hellyeahai.com/managed-ad-accounts), [Tracking](https://docs.hellyeahai.com/tracking/dashboard) and the OS PRD. Documentation was checked October 18, 2026. Validate current source limits during binding without guessing CLI flags or new public APIs.

# Hellyeah compatibility map

This map separates documented product behavior from proposed extension contracts. Source code and internal service types are assumed available during the joint build. No credentials or external account setup are needed for fixture development.

| Existing behavior | Authoritative source | OS mapping | Module impact | Required test |
| --- | --- | --- | --- | --- |
| One organization owns brand, campaigns, Wallet and tracking | [Concepts](https://docs.hellyeahai.com/concepts) | Pin organization context to every record/tool | All four | Cross-organization access denied |
| Profile completion precedes campaign work | [Brand](https://docs.hellyeahai.com/brand-profile) | Versioned BrandSnapshot and repair/resume | OS, Simulator, Creative | Incomplete brand blocks source submission |
| Campaign Agent prepares editable drafts | [Campaigns](https://docs.hellyeahai.com/campaigns) | Candidate planning attaches to source draft | OS, Simulator | Material edit invalidates forecast/grant |
| Search keywords are read-only and priced | [Managed accounts](https://docs.hellyeahai.com/managed-ad-accounts) | Reprice through supported strategy flow | Simulator, Experiments | Unpriced change denied |
| Managed accounts are the execution path | [Managed accounts](https://docs.hellyeahai.com/managed-ad-accounts) | Existing CampaignPort; no advertiser BYO OAuth | All four | No parallel provider write path |
| Creative Sets contain text and landscape/square candidates | [Studio](https://docs.hellyeahai.com/creatives) | Exact versions and selected-candidate mapping | Creative, Simulator, Experiments | Submitted snapshot survives library edit |
| Search can use text while imagery renders | [Studio](https://docs.hellyeahai.com/creatives) | Channel-specific readiness | OS, Creative, Experiments | Search ready without PMax imagery |
| PMax needs final required image selections | [Studio](https://docs.hellyeahai.com/creatives) | Preserve readiness; separate model capability | All four | Missing final candidates fail |
| Conversion submission requires receiving X-Ray | [Campaigns](https://docs.hellyeahai.com/campaigns) | Check verified tracker health | OS, Simulator, Experiments | Disabled/unverified tracker denied |
| Impression goals can submit without tracking | [Campaigns](https://docs.hellyeahai.com/campaigns) | Delivery-only analysis; no invented conversions | OS, Simulator | No silent goal conversion |
| Public X-Ray collect/config is not reporting | [API boundary](https://docs.hellyeahai.com/tracking/api-reference) | Internal authenticated XRayPort | All four | Acknowledgment is not stored-event proof |
| Typed conversions have stable names | [Track events](https://docs.hellyeahai.com/tracking/track-events) | Metric dictionary and deduplication | Simulator, Experiments, OS | `cv_purchase`/`cv_lead_submit` mapped correctly |
| Wallet reserves maximum once before review | [Wallet](https://docs.hellyeahai.com/wallet) | Source transaction and operation readback | OS, Experiments | Duplicate submit cannot reserve twice |
| Review precedes managed Google setup/serving | [Campaigns](https://docs.hellyeahai.com/campaigns) | Distinct workflow/source projections | OS, Experiments | Submission is not marked Serving |
| Pending refunds are unavailable | [Refunds](https://docs.hellyeahai.com/billing-safety/cancellations-refunds) | Source settlement projection | OS, Experiments | Pending amount excluded from funds |
| CLI coverage differs by installed release | [CLI](https://docs.hellyeahai.com/cli/reference) | Versioned capability discovery, no guessed flags | All adapters | Unknown flags fail before side effects |
| Launch and funding require explicit confirmation | [Approvals](https://docs.hellyeahai.com/billing-safety/approvals) | Exact plan grant; future delegation separately adopted | OS, Experiments | Agent cannot approve itself |

## Proposed integrations to implement with the joint team

The following are design requirements, not claims about publicly available APIs: organization-scoped internal reporting ports; policy delegation; native experiment exposure/statistics export; OS client-view capability; versioned model registry; source operation deduplication/lookup; and durable workflow callbacks. Bind them to existing implementations where available, otherwise add them under the same ownership and transaction boundaries.

## Contract prework completed

The specs decide identity mapping, monetary representation, source lifecycle ownership, approval hashing, credential boundaries, retry/readback semantics, creative version lineage, metric maturity, experiment inference limits and fixture substitution. The starter implements a small testable subset. The next build begins with persistent storage and UI/adapters rather than reopening those product decisions.

## Integration certification checklist

- Obtain exact shared internal request/response/event types and capability flags.
- Verify organization/account/source IDs and scoped credentials in staging.
- Reconcile Brand/Studio versions and immutable submitted snapshots.
- Reconcile source Wallet reservations, balances and ambiguous submission readback.
- Verify accepted X-Ray events through protected internal reporting; test disabled tracking.
- Verify review, rejection, setup, serving, pause, cancellation and late spend states.
- Validate experiment statistics/estimand availability instead of deriving false p-values from daily totals.
- Run fixture, staging and source failure suites before approved canary writes.

Source check: October 18, 2026. Production compatibility is a specified and testable target; only fixture compatibility is verified in this starter.

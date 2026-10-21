# Four-product implementation and integration status

Updated October 19, 2026. This records the shipped prototype against the four original PRDs. It is not a declaration that every production acceptance criterion is complete.

## Experience delivered

The primary experience now recreates the existing Hellyeah dashboard from official documentation screenshots. It uses the light sidebar, organization selector, Overview, Campaigns, Brand, Studio, Wallet and Tracking, with sans-serif headings and grouped light panels. See [dashboard foundation](dashboard-foundation.md). The four future products below remain implemented at their deep links but are intentionally excluded from the primary navigation and search until the baseline experience is accepted.

The primary journey is business setup → Brand review → Studio → campaign brief → editable draft → X-Ray → Wallet → explicit budget confirmation → review. It does not require the Simulator or an experiment. The previously built four-product guide remains available at `#demo`; no production feature-completion claim is implied by preserving it.

| PRD | Working demo surface | Cross-product handoff | Production work remaining |
| --- | --- | --- | --- |
| 01 Autonomous Growth OS | Persisted feedback, bounded recommendations, evidence inbox, personal and opted-in aggregate learning, customer experience controls, durable application jobs | Consumes a completed campaign/experiment recipe and records its Mastra decision; source revisions and retries are retained | Hellyeah identity/reporting/Wallet/draft adapters, real measured outcome validation, durable Mastra workflow checkpoints for long-running provider work |
| 02 Campaign Simulator | Editable budget/duration/channel/goal, seeded outcome range, saved scenario comparison, stale-input protection, exact-plan review | Uses selected Studio creative; saved Search purchase plans enter the full guided campaign; snapshots can be sent for OS research | Calibrated response models, backtesting and prediction coverage, real account inputs and unsupported-channel forecasts |
| 03 Creative Intelligence | Creative browsing/filtering, inspected copy and angles, labelled sample research, creative completion, pinned experiment snapshots | Creative seeds a simulator or experiment; research snapshots reach the OS inbox | Isolated real browser capture/OCR, real source provenance/artifact retention and reviewed extraction pipeline |
| 04 Experimentation | Registered designs, explicit start/pause, synthetic result generation, linked campaign settlement, direct outcome learning | Completed linked experiments call the same persisted OS learning path as the guide; archived replays retain their recipe | Real visitor assignment, durable exposure/outcome collection, validated stopping and inference, production execution adapters |

## Correctness changes in this revision

- Performance Max requires ready text as well as both selected image formats.
- Experiments retain their creative version and content; the inspector opens that snapshot.
- Research-design sharing is labelled separately from learning from completed results.
- Archived result learning keeps the original run identity and canonical funding context.
- Campaign form edits and focus survive OS connection refreshes.
- Unavailable prerequisites have direct repair links instead of an unexplained dead end.

## Release verification

Run `npm run check`, `npm run typecheck`, and the Sites production build. The automated checks exercise the DOM, HTTP boundary, SQLite/D1 repository, Mastra evaluation, privacy/isolation, idempotency and three outcome branches. The current environment has no supported browser QA skill; responsive layout rules and DOM checks do not constitute a pixel-perfect visual verification.

No production ad account, payment account, live capture provider or outcome feed is connected by this interface revision. The existing hourly worker contract and owner-private audience are unchanged.

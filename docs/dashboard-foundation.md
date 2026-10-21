# Existing Hellyeah dashboard foundation

Updated October 19, 2026. This phase recreates the existing customer product before integrating the four proposed additions. It supersedes the marketing-first entry experience. The four PRDs and implementations are retained.

## Reference and visual decisions

Primary references inspected: [Quickstart](https://docs.hellyeahai.com/intro/quickstart), [Brand](https://docs.hellyeahai.com/brand-profile), [Campaigns](https://docs.hellyeahai.com/campaigns), [Studio](https://docs.hellyeahai.com/creatives), [Wallet](https://docs.hellyeahai.com/wallet), [Tracking](https://docs.hellyeahai.com/tracking/dashboard).

Screenshots were opened and visually inspected, rather than relying on the public marketing homepage. Their source directory is `https://docs.hellyeahai.com/_next/static/immutable/media/`:

| Screenshot | Applied structure |
| --- | --- |
| `dashboard-overview.1s2nqoo3e6cfz.png` | Light left sidebar, organization selector, primary navigation order, greeting, metric strip and grouped panels |
| `campaign-prompt.0fsm6hc28rn12.png` | Centered goal prompt, orange starburst and suggestion chips |
| `campaign-launch-readiness.2nfzz_7zltieu.png` | Editable campaign with separate readiness rail and explicit spending confirmation |
| `brand-profile.21h18-y73d-0q.png` | Identity, numbered strategy rows, color chips and Edit action |
| `studio-library.2hpfe7m5os73t.png` | Search/filter library, dashed New Creative Set tile, creative previews |
| `wallet.0un21mvjqq_mi.png` | Available balance, financial summary, transaction history and Top Up |
| `tracking-setup-methods.1hpvgk4ln5ral.png` | GitHub, Google Tag Manager, Shopify and manual method selection |

GeneralSans is used for dashboard headings. Orange is an accent; the product is mostly white/light gray. The homepage's editorial Lastik treatment is not used for the core dashboard. Screenshot sample balances, outdated caps and promises of likely signups were not copied as product policy.

## Run the existing workflow

1. The site opens Overview with explicitly fictional campaign records. Primary navigation shows only the existing customer areas.
2. Choose **Set up your business**, enter the business name and website/work email. A different business gets blank facts for manual review, not fabricated website research. Existing local records are retained.
3. Open **Edit** in Brand. Save industry, description, audience, goal, tone, value proposition, market and color. A new business invalidates the previous website's tracking readiness.
4. Open **Studio → New Creative Set**. Enter copy and direction, pick a visual template, then **Use in a campaign**. Samples are labeled and do not imply a live image model call.
5. Enter a goal sentence in **New Campaign**. An editable draft appears with creative, destination, market, language, daily budget and duration. Nothing is reserved during drafting.
6. For conversions, choose a method in **Tracking**, then record a labeled sample event. Installation alone does not satisfy the conversion gate. Impression campaigns can proceed without tracking.
7. In **Wallet**, Top Up adds fictional balance only. Return to the campaign draft through Campaigns.
8. **Review launch** saves current edits and shows the maximum spend. Explicit confirmation reserves once and enters In Review. Approving the demo review changes the fixture to Serving without any provider call.
9. Inspect the saved creative and Brand versions, pause/resume, and inspect Wallet history. Submitted snapshots remain stable after later edits.

## Architecture and regression boundaries

- `foundation-model.mjs`: baseline business/creative/tracking/draft/reservation domain operations.
- `foundation-controller.mjs`: baseline forms and actions.
- `foundation-views.mjs`, `foundation.css`: screenshot-derived product UI and responsive layout.
- Existing local account storage is migrated additively; future-feature work is not deleted.
- Baseline actions do not auto-enroll or write new OS evidence. Future-feature routes continue to use their existing server integration.
- Four additions are retained at `#growth`, `#simulator`, `#creative`, `#experiments`, plus `#learning` and `#demo`; Wallet research controls are retained at `#wallet-lab`. None appear in baseline navigation or search.
- Owner-private access, service credentials, database records, worker contract and ad execution authority remain unchanged.

## Honest completion boundary

This is a functioning local demo of the documented core workflow, not the actual authenticated Hellyeah service. Website research, model-generated creatives, Google account provisioning/Keyword Planner, live X-Ray installation, real organizational membership and invitations, Stripe checkout, ad serving and provider metrics require integration. The campaign editor uses a modal for the draft and supports market/language/duration rather than every production targeting and schedule control. Overview uses available sample metrics; it does not manufacture a ROAS or country map when the fixture has no corresponding data.

The required control-browser skill is unavailable in this environment. DOM interaction tests, data-model tests, type checks and a production build verify behavior; they do not establish pixel-perfect visual fidelity. Browser visual comparison against these screenshots remains a release follow-up before declaring the replica 100% complete. The next phase must not put the four additions back into the primary experience until this foundation is reviewed.

# UI implementation handoff

Updated October 20, 2026. The default experience reproduces the existing Hellyeah dashboard before integrating the four new products. This document replaces the earlier static-shell handoff. The independent `hell_yeah2` project has no ODA dependency.

## Start here

Read [dashboard foundation](dashboard-foundation.md) for the screenshot references and complete customer walkthrough. Read [product completion](product-completion-matrix.md) for the four PRDs' working demo surfaces and production gaps. The primary navigation contains **Overview, Campaigns, Brand, Studio, Wallet, and Tracking**. The proposed products remain available by deep link, without appearing in baseline navigation or search.

| Route | Current interaction | Data boundary |
| --- | --- | --- |
| `#overview` and `#home` | Date/metric views, campaign summary and setup actions | Browser-local fictional campaign records |
| `#onboarding` | Enter business name and website/work email; continue to manual Brand review | A changed business clears unreviewed prior facts and invalidates prior tracking readiness |
| `#brand` | Edit identity, audience, strategy, market and colors | Versioned local profile; submitted snapshots stay immutable |
| `#studio` | Search/filter creative sets, create a labeled template sample, use it in a campaign | No live image model or website research |
| `#new-campaign` | Goal prompt and editable draft with creative, destination, budget and duration | No reservation while drafting |
| `#campaigns` | Find campaigns, edit drafts, review exact launch budget, approve demo review, pause/resume | One-time fictional reservation; simulated source lifecycle |
| `#tracking` | Select installation method and record a labeled sample event | Installation alone does not satisfy conversion readiness |
| `#wallet` | Available/reserved/spent/pending balance and transaction history; fictional Top Up | No payment provider or real funds |
| `#settings` | Submission pause, JSON export and confirmed local reset | Local controls are not production authorization |

The connected four-product guide is retained at `#demo`. Other retained routes are `#growth`, `#simulator`, `#creative`, `#experiments`, `#learning`, and `#wallet-lab`. See [demo walkthrough](demo-walkthrough.md) for this separate path. Baseline startup and actions do not automatically enroll a workspace or submit new OS evidence.

## Local development and build

Use the Node and pnpm versions in [README](../README.md) and `package.json`. Install from the tracked `pnpm-lock.yaml`; this project has no npm lockfile, so `npm ci` is not its installation path.

```bash
corepack pnpm install --frozen-lockfile
npm run dev
```

The portable development server uses port 5173. Use its local sign-in flow for authenticated OS features. Before handoff, run:

```bash
npm run quality
npm run build
```

This is a Vinext/Cloudflare Worker application with D1-backed APIs, not a static-only website. `dist/` contains the generated application and Worker output. Serving it as a plain static directory does not provide the OS API, identity boundary or durable storage. `npm start` runs the built Worker locally; development and local sign-in are provided by `npm run dev`. Hosted publication uses the Sites workflow and preserves the existing owner-private audience.

## Code boundaries

| File or directory | Responsibility |
| --- | --- |
| `web/js/foundation-model.mjs` | Baseline business, creative, tracking, draft and reservation operations |
| `web/js/foundation-controller.mjs` | Baseline form and action handlers |
| `web/js/foundation-views.mjs`, `web/foundation.css` | Screenshot-derived dashboard and responsive layout |
| `web/js/model.mjs` | Shared local state, legacy planning tools and persistence codec |
| `web/js/views.mjs`, `web/js/app.mjs` | Shell, routes, escaped views, event delegation and local persistence |
| `web/js/os-controller.mjs` | Authenticated OS client behavior, loaded for the retained research routes |
| `src/os/` | Durable feedback, source evidence, decisions, jobs, trial learning and HTTP authority |
| `src/mastra/` | Typed Mastra workflows over deterministic domain tools |
| `app/api/os/[[...path]]/route.ts`, `db/` | Worker API and D1 binding/schema |
| `contracts/ports.ts` | Proposed internal Hellyeah integration interfaces |
| `scripts/prepare-web.mjs` | Prepares browser assets for the application build |

The app uses official Hellyeah colors and self-hosted brand assets. Dashboard headings use GeneralSans. Orange is an accent on a mostly white/light-gray interface. The fictional Forma creatives and sample performance are explicitly illustrative.

## Persistence and authority

Campaigns, Brand, Studio, Tracking and Wallet in the baseline are browser-local demo records. The server persists submitted OS evidence, feedback, decisions, research snapshots, operation receipts and accepted jobs in D1. A local export is not a production ledger or a complete server backup.

The server owns tenant isolation, request validation, source revision checks, idempotent receipts and authenticated research review. Browser checkboxes and local storage never authorize real spend. Real Hellyeah organization roles, reporting, Brand/Studio/Campaign/Wallet/X-Ray adapters, calibrated models, provider capture and financial execution remain integration work. Mastra intermediate checkpoints remain in memory; durable application jobs wrap short evaluations.

## Next implementation order

1. Review the foundation in a real browser against the official screenshots, including mobile and keyboard flows. Keep the four additions outside primary navigation until this is accepted.
2. Bind existing Hellyeah organization identity and source-derived internal adapters; preserve the current source lifecycle and exact spending approval.
3. Replace baseline fixture transports with certified staging services while retaining negative-path, version and idempotency tests.
4. Integrate the proposed products into the accepted foundation, using immutable evidence and measured outcomes rather than invented performance.
5. Add persistent Mastra checkpoints before long-running provider workflows, and validate prospective outcome improvements before live autonomous decisions.

## Verification boundary

Domain and DOM tests cover local lifecycle transitions, stale snapshots, tracking readiness, duplicate reservations and connected forms. The broader suite covers HTTP, SQLite/D1-compatible persistence, Mastra, source corrections, job recovery and tenant isolation. See [verification](verification.md) for recorded evidence.

DOM tests do not establish pixel correctness, full accessibility or real ad-provider behavior. Real browser screenshot/viewport and keyboard checks remain outstanding in the recorded foundation release. No claim of a fully integrated production advertising platform follows from a successful build.

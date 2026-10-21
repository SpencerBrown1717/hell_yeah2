# hell_yeah2

A working Hellyeah dashboard demo, four connected product specifications, and a Mastra-powered Growth OS research implementation. Built as a separate project for a joint integration with Hellyeah.

**Status:** the existing dashboard experience is the default. The four new research products are preserved behind direct routes while the core flow is reviewed. Real ad accounts, payments, and production Hellyeah adapters are not connected.

Private preview: https://hell-yeah2.brownspencer7.chatgpt.site

The default entry is now a replica of the existing Hellyeah **dashboard**, based on the official documentation screenshots: Overview, Campaigns, Brand, Studio, Wallet, and Tracking. Start with **Set up your business** or **New Campaign**. The four future additions are preserved in code and at their existing deep links, but are excluded from the primary navigation and baseline search. They will be integrated after the existing experience is approved. See [baseline fidelity and walkthrough](docs/dashboard-foundation.md), [product completion matrix](docs/product-completion-matrix.md), and [OS learning design](docs/os-learning-design.md).

| Specification | Numbered page sections | Purpose |
| --- | ---: | --- |
| [Autonomous Growth OS](docs/prds/01-autonomous-growth-os.md) | 25 | Existing-flow integration, decision policy, orchestration, shared contracts, money authority and rollout |
| [Campaign Simulator](docs/prds/02-campaign-simulator.md) | 12 | Conditional forecasts, uncertainty, calibration, scenario review and test handoff |
| [Creative Intelligence](docs/prds/03-creative-intelligence.md) | 12 | Capture, source evidence, Studio versions, research briefs and measured feedback |
| [Experimentation Platform](docs/prds/04-experimentation-platform.md) | 12 | Registered designs, assignment, analysis, scoped execution, reconciliation and learning |

[PRD provenance](docs/prd-provenance.md) records the recovered version 2.0.0 originals, their checksums and how the current files relate to them. Each Markdown file has explicit numbered page sections and `<!-- PAGE -->` boundaries. Markdown has no universal physical page size; the sections define the pagination contract. The validator checks at least ten substantive sections in every file and that the OS is the largest. A print renderer should map each marker to a page break and preserve tables/code wrapping.

## Existing flow mapping

Read the [compatibility matrix](docs/compatibility-matrix.md) before implementation. The integration target is the current Hellyeah Dashboard/CLI flow:

**Organization → reviewed Brand Profile → Campaign Agent and Studio → X-Ray readiness → exact launch approval → source Wallet reservation → source review → managed Google setup → Serving → measured results.**

Preserve the current source authority, including managed ad accounts, read-only priced Search keywords, PMax final candidates, conversion tracking requirements and Wallet settlement. Public docs do not expose all internal APIs; the proposed [ports](contracts/ports.ts) bind to source-derived internal types during the assumed joint build. They are not invented public REST endpoints.

## Run the starter

Use Node 24.15 or newer in the 24 LTS line (tested with 24.19); Node 22.22.2 also satisfies the locked test dependencies. The pnpm lockfile fixes resolved dependency versions; install it without updating the lockfile.

```bash
git clone https://github.com/SpencerBrown1717/hell_yeah2.git
cd hell_yeah2
corepack pnpm install --frozen-lockfile
npm run dev
# Open http://localhost:5173

# In another terminal:
npm run quality
npm run build
```

The development command prepares all interface assets, including on a clean clone. Visit `/signin-with-chatgpt?return_to=/` on localhost to use the local test identity for persisted OS features. No actual ChatGPT or Hellyeah account is impersonated. See [local development](docs/local-development.md) for environment, storage, troubleshooting and deployment details.

`npm run check` validates the PRDs and color contrast, runs the domain and DOM interaction tests, and executes a real Mastra typed workflow over the fixture flow. `npm run demo` also works without installing dependencies because its domain reference uses Node built-ins only. No model key, network service, card or real account is needed for either fixture flow after dependencies are installed.

The deterministic reference covers creative evidence → uncalibrated assumption simulation → experiment plan → fixture scoped approval → one source Wallet reservation → simulated review/serving → descriptive mature outcomes → keep-incumbent decision. Its tests cover wrong organization, stale/malformed/expired approvals, missing tracking, PMax variants, repricing, pending refunds, duplicate requests and source-state conflicts.

## What is implemented

- Four detailed specifications with shared ownership and cross-module contracts.
- Persistent Autonomous OS and Learning lab plus responsive UI for Overview, Campaigns, Simulator, Creative Intelligence, Experiments, Brand/X-Ray, Wallet and Settings.
- Functional local simulation, review queue, one-time demo reservations, creative-to-experiment handoff, search, filters, JSON export and reset.
- Fixture inputs, deterministic domain tools and meaningful negative-path tests.
- Real Mastra typed workflows, including feedback/ROI evaluation and continuous trial learning.
- D1 transaction records, tenant isolation, audit trail, fenced optimistic concurrency and compact idempotent receipts.
- Durable evidence inbox connecting Simulator, Creative and Experimentation to the OS with immutable versions and exact research review.
- Isolated full mock campaign with source corrections, zero-outcome handling, duplicate-reservation protection and real Mastra evaluations.
- A bounded personal qualification model, opt-in cohort prior, drift veto and a shadow-only paired benchmark.
- Prospective trial registration, correction-aware personal strategy learning, opt-in matched cohorts and exact managed draft handoff.
- Customer experience ratings, optional funding suggestions, seven-day snooze and unpaid Wallet intents with a replaceable Stripe Checkout port.
- Customer reinvestment controls, accept/decline reasons, cooldown and exact review drafts that move no funds.
- Proposed internal integration ports, environment template and a source-binding/cutover checklist.
- Official Hellyeah brand tokens, CSS roles and executable normal-text contrast checks.

## What remains for the product build

OS feedback and final decisions persist in D1, with server-derived personal pilot identities. Mastra intermediate checkpoints remain in memory. Campaigns and product drafts retain browser-local fixture adapters; submitted research snapshots and their reviews persist in D1. Normalized fixture source reports support corrections and account-wide deduplication. Economic evidence, model outcome samples and the benchmark are synthetic. The fixed replay yields 1.25× and fails the 2× target; no real ROI improvement has been demonstrated.

Production Hellyeah organization membership, live source ingestion, production worker provisioning, live internal adapters, isolated capture/OCR, calibrated response models and prospective policy experiments remain work. No real ad spend is authorized by this build.
Changing environment variables alone does not certify a live integration. During the joint build, replace fixture transports with source-derived adapters, preserve the domain contracts, pass the same failure suite against staging, then progress through shadow and exact approved canaries. Read OS pages 17–19 and [integration readiness](docs/integration-readiness.md) for the full sequence and current module boundaries.

## Start next session

1. Read the OS PRD, compatibility matrix and [build handoff](docs/build-handoff.md).
2. Run `npm run check` and inspect the fixture result.
3. Read [continuous learning](docs/continuous-learning.md), run `npm run demo:optimization`, and bind canonical organization roles and the trusted trial reporting feed to the existing leased workers.
4. Bind Brand/Studio/Campaign/Wallet/X-Ray ports to Hellyeah's shared source types.
5. Replace remaining browser fixtures with source adapters; certify staging parity and prospective learning before enabling real spend.

Reference date: October 18, 2026. This is a separate repository and has no ODA dependency.

## Repository and CI

The application lives at the repository root. Run the install, development, quality and build commands beside `package.json` and `pnpm-lock.yaml`. The manual-upload folders `Hell_yeah_2.1/` and `hell_yeah2/` have been consolidated into this layout; their original commits remain in GitHub history. The project map below describes the source directories.

The private Site source repository preserves the published source. The separate private GitHub repository is [SpencerBrown1717/hell_yeah2](https://github.com/SpencerBrown1717/hell_yeah2); release checks and verification evidence are recorded in [verification](docs/verification.md).

[GitHub Actions](.github/workflows/quality.yml) installs the frozen lockfile, runs lint, type checks, tests and deterministic Mastra rehearsals, then builds the Worker application. See [contributing](CONTRIBUTING.md) before changing policy, money or tenant boundaries.

With GitHub CLI authenticated as the repository owner, `bash scripts/push-github.sh` creates a private destination if needed and pushes the clean committed source to `main`. It retains the Sites origin and never force-pushes. A divergent destination is intentionally rejected for review.

## Continuous learning release

The [implementation and binding guide](docs/continuous-learning.md) maps personal/network learning, customer experience and voluntary Wallet growth to the existing Hellyeah flow. `npm run demo:optimization` replays seven synthetic accounts through durable jobs → Mastra → a reviewed draft → corrected evidence → hold. Live reporting, campaign drafts and the existing Wallet/Stripe service still require their internal adapters; setting a URL alone does not certify them.

## Project map

| Area | Location |
| --- | --- |
| Existing dashboard UI and baseline business rules | `web/js/foundation-*.mjs`, `web/foundation.css` |
| Worker shell and API entry | `app/`, `build/`, `vite.config.ts` |
| OS policy, evidence, orchestration and persistence | `src/os/`, `src/mastra/` |
| Shared domain boundaries | `contracts/`, `db/`, `drizzle/` |
| Specifications and integration handoff | `docs/prds/`, `docs/compatibility-matrix.md` |
| Verification and repeatable demos | `tests/`, `scripts/`, `fixtures/` |

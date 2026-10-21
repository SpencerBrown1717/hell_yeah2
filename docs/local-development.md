# Local development

## Requirements and first run

Use Node 24 LTS (24.15 or newer) and pnpm **11.25.0**, as declared in `package.json`. CI uses Node 24. Node 22.22.2 also satisfies the supported engine range.

```bash
corepack pnpm install --frozen-lockfile
npm run dev
```

If Corepack is unavailable, install the exact package manager with `npm install --global pnpm@11.25.0`, then run `pnpm install --frozen-lockfile`. Do not use `npm ci`: this repository ships `pnpm-lock.yaml`, not an npm lockfile.

Open `http://localhost:5173`. The dev command copies shared CSS, fonts and browser modules into `public/` automatically. Files under `public/assets/` and `public/js/` are generated; edit their source under `web/`.

For the current user journey, follow [the dashboard walkthrough](dashboard-foundation.md#run-the-existing-workflow). Sample campaigns, creatives, events and balances are explicitly fictional.

## Local identity and data

Clean clones use the portable execution profile. The development server offers a loopback-only test identity at `http://localhost:5173/signin-with-chatgpt?return_to=/`. It is a local fixture, not access to a real customer account. This middleware strips caller-supplied identity headers and only operates on localhost. Never expose the development server as a production authentication system.

The baseline dashboard uses browser-local fixture storage. The OS HTTP API uses local Cloudflare D1 during development and the configured D1 binding on the hosted Site. Clearing browser data does not clear server-side OS records. Local Worker state belongs under ignored `.wrangler/`; hosted records are unaffected by local changes.

The four future products remain available at `/#growth`, `/#simulator`, `/#creative` and `/#experiments`, with supporting labs at `/#learning`, `/#demo` and `/#wallet-lab`. They are intentionally absent from the main navigation while the existing product is reviewed.

## Environment and integration

Fixture checks and deterministic Mastra rehearsals need no API keys. `.env.example` documents intended joint-build bindings. Most `HY_INTERNAL_*` values are an integration contract, not implemented live transports. Filling them alone does not connect Google Ads, Stripe or Hellyeah.

Keep local secrets in ignored environment files (`.env*` or `.dev.vars*`), never in tracked configuration or screenshots. The active OS route reads `HY_OS_SERVICE_KEY` and `HY_OS_PRIVATE_WORKER_ENABLED` from Worker bindings. Configure production secrets through the hosting service. Keep live writes disabled and the private worker disabled outside an explicitly enrolled, owner-private deployment.

## Checks

```bash
npm run quality       # strict lint, types, specs, tests, deterministic rehearsals
npm run build         # client and Worker production bundles
npm run demo          # dependency-free domain reference
npm run demo:os       # policy evaluation
npm run demo:campaign # mock provider campaign
npm run demo:optimization # synthetic personal/cohort learning replay
```

`npm run quality` is the GitHub CI gate. Tests cover domain and DOM behavior; they do not prove visual fidelity or real advertising uplift. Validation scripts do not launch ads or charge a card.

## Deployment

This is a Vinext/Vite Cloudflare Worker application, not a static-only site. `dist/client` contains assets; `dist/server` contains the Worker. Preserve `.openai/hosting.json`, the `sites()` Vite integration, D1 binding and migrations when updating the existing private Site. GitHub stores source and runs CI; pushing to GitHub does not provision a new hosted application or production credentials.

`npm start` serves a built Worker locally for deployment debugging. Use `npm run dev` for the local identity workflow: development auth middleware is not a production sign-in provider. Hosting elsewhere requires a verified identity boundary, D1-compatible storage and an explicit deployment configuration.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing CSS or fonts | Run `npm run dev` or `node scripts/prepare-web.mjs`; do not edit generated `public/` copies. |
| OS sign-in needed on localhost | Visit the local sign-in URL above, then reload. Use localhost rather than a LAN hostname. |
| Unsupported engine or package-manager error | Check `node --version` and `pnpm --version`; use the pinned toolchain. |
| Frozen install fails after changing dependencies | Update and review `pnpm-lock.yaml` with the pinned pnpm; do not bypass the frozen CI check. |
| GitHub mirror rejects a push | Inspect the remote history and integrate it normally. Never force-push or replace the Site origin. |
| Hosted API is unavailable | Check access, Worker logs and bindings; do not make the private Site public to bypass authentication. |

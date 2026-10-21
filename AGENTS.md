# Agent working guide

This repository is `hell_yeah2`, independent of ODA. Preserve the current default experience: Overview, Campaigns, Brand, Studio, Wallet and Tracking. The four future products are retained at deep links and must not be restored to primary navigation without a product request.

Read `README.md`, `docs/dashboard-foundation.md`, `docs/compatibility-matrix.md` and the relevant `docs/prds/` file before feature work. Use `docs/product-completion-matrix.md` to distinguish fixture behavior from production integrations.

Use the pinned pnpm lockfile. Run `npm run quality` and `npm run build` for a release. Make focused regression tests for consequential behavior changes; do not fabricate test outcomes or ROI claims. Browser verification and live-adapter verification are separate from DOM/unit tests.

Keep policy, orchestration, persistence adapters, UI controllers and views modular. Preserve organization scoping, versioned evidence, consent, approval, lease fencing and idempotency. Fixtures must remain visibly synthetic and excluded from real cohort learning. New spend or funds movement requires explicit authority and working source adapters.

Never write credentials to source, logs, screenshots or command arguments. `.env*`, `.dev.vars*`, local Worker databases, build outputs and dependency folders stay untracked. Do not change Site audience, production credentials or live-write settings without the corresponding task authorization.

Respect the existing Site project identity and source remote. GitHub is a separate destination. Never force-push, overwrite unrelated work or claim a GitHub push without a verified remote commit. Keep docs current with route and command changes.

# Contributing

Start with [local development](docs/local-development.md) and [the compatibility matrix](docs/compatibility-matrix.md). The immediate product priority is fidelity to the existing Hellyeah dashboard. Integrate the four proposed products only after that baseline is reviewed.

1. Create a focused branch from the latest source.
2. Keep business rules in domain modules, UI events in controllers, and rendering in views. Bind production services through `contracts/` rather than adding provider calls to browser code.
3. Add meaningful regression coverage for changed policy, authorization, money or persistence behavior. Label fixture evidence and keep it outside real customer learning.
4. Run `npm run quality` and `npm run build`. Report visual or provider checks that could not be performed.
5. Open a pull request describing the user-visible change, tests, migration effects and remaining integration limits.

Never commit secrets, customer exports, browser state, generated bundles or local databases. Preserve tenant scoping, immutable evidence versions, idempotency, lease fencing and exact spend approval. Do not enable live advertising or payments as a side effect of a UI change.

GitHub Actions runs without production secrets. The Site source origin and GitHub destination are separate remotes; use `scripts/push-github.sh` only from a clean reviewed commit. Resolve history divergence rather than force-pushing. The script does not deploy production or alter sharing.

Keep documentation aligned with actual routes and behavior. Treat the PRDs as target specifications, not evidence that every production integration is finished. Update [the completion matrix](docs/product-completion-matrix.md) and [verification evidence](docs/verification.md) when capabilities change.

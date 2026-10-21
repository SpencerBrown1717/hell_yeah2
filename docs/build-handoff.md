# Build handoff

Start with the four PRDs in order. OS is the parent; use its identity, authority and lifecycle conventions when an older generic term appears in a module. `tenant_id` is the algorithmic alias for the existing Hellyeah `organization_id`, never a second business namespace.

## Decisions already made

| Topic | Decision |
| --- | --- |
| Repository | Independent `hell_yeah2` |
| Orchestration | Mastra; deterministic domain tools own numbers and authority |
| Current customer flow | Extend existing Dashboard/CLI concepts and managed-account path |
| Financial authority | Existing Wallet and campaign/review services |
| Tracking | Existing X-Ray; conversion gate and source metric definitions preserved |
| Creative ownership | Existing Studio and campaign snapshots |
| Initial model | Uncalibrated Search fixture now; certified Search model is the production target; PMax remains planning |
| Experimental scope | First-party randomized landing tests and supported internal/native Search tests |
| UI colors | Official tokens; black on orange for normal button text |
| Development mode | Fixtures first; live transport fails closed until bound and certified |
| Learning proof | Temporal forecast validation and prospective policy evidence |

## Starter commands and files

```bash
corepack pnpm install --frozen-lockfile
npm run check
npm run demo
```

Read `fixtures/scenario.json`, `src/domain.mjs`, `src/mastra/workflow.mjs`, `contracts/ports.ts` and the tests. The fixture approves only simulated money and never calls an external model or service. The numerical fixture has fixed historical assumptions, not a trained response model. The descriptive result deliberately remains inconclusive.

## Production implementation work after the current pilot

1. Extend the implemented persistent OS records and operation receipts with normalized facts, operational retention and live source operation lookup under OS pages 8–11.
2. Replace personal pilot identity with source-derived organization roles; preserve the completed shell and shared brand tokens.
3. Add live adapter classes using exact source-derived internal types; preserve fixture adapter tests.
4. Implement isolated capture, field evaluation, numerical fitting and valid experiment analysis as separately testable services.
5. Add Mastra specialist agents to the typed tools, persistent snapshots and authenticated review callbacks.
6. Verify staging source lifecycle/Wallet parity, then shadow recommendations before an exact approved pilot.

## Required next-session evidence

Show a user flow in the actual UI backed by persisted fixture records, then staging source records. Record changed files, meaningful tests, source binding evidence and remaining live gaps. Do not present a specification or the in-memory emulator as a complete autonomous production product.


## UI phase completed

The visual shell and connected browser-local demo are implemented in `web/`. Read [the UI handoff](ui-phase-handoff.md) for the current route/action map, verification boundary, and next OS work. Do not rebuild the visual shell before binding persistent APIs. Preserve the existing source lifecycle and keep the demo label until real authenticated services are certified.

## OS implementation now available

Read [the learning design and current next-work order](os-learning-design.md). Durable feedback, per-user pilot identity, final decisions, aggregate contributions and authenticated APIs are implemented. `src/os/` is the active implementation; `src/domain.mjs` remains the original integration-contract reference. Run `npm run check` and `npm run build`. The durable job queue now handles source cursors, ordered processing and retry recovery. Next bind real source readers and normalize the bounded workspace evidence.

Read [integration readiness](integration-readiness.md) for the current all-product evidence inbox, source corrections, isolated campaign rehearsal, limits and GitHub mirror procedure.

Read [background operations](background-operations.md) for the new worker boundary, source batching contract, dashboard controls and fault-recovery evidence. Queue delivery is durable; intermediate suspended Mastra steps still require a persistent workflow adapter.

# 100-customer synthetic learning replay

All 100 businesses, contacts and observations are invented. This fixture is an isolated functional test, not a revenue-lift study or production customer evidence.

## Run

```sh
npm run demo:customers
# Import Excel, validate and run the entire OS replay (requires Python 3):
npm run replay:workbook -- /absolute/path/HellYeah_100_Synthetic_Customers.xlsx
# Reprocess the recorded, editable JSON fixture in a fresh isolated SQLite database:
npm run demo:customers -- --input fixtures/customer-learning/customers.json --output artifacts/customer-simulation-edited
```

Requires the repo's supported Node version with `node:sqlite`, installed dependencies, and no external credentials. The script cannot connect to production. It uses the same normalized source contract, durable job repository, worker, OS repository and Mastra learning workflow as the app. SQLite implements the existing D1 test port. Mastra's orchestration store is in-memory here; the OS business state, receipts, source cursors and audit events use SQLite during the run.

## What is recorded

- `fixtures/customer-learning/customers.json`: the exact 100 input rows, deterministic generation, source disclosure and case references.
- `fixtures/customer-learning/results.json`: the completed replay, individual before/personal/pooled decisions, quality estimates, cursor positions, audit event references, worker results and input SHA-256.
- Generated output under `artifacts/customer-simulation/`: current input and result snapshots. Re-running starts with a fresh database; it does not append fictional evidence to any live workspace.
- The Excel workbook is the readable, editable companion. Its financial formulas recalculate, while its OS Results tab records a completed replay. Run `replay:workbook` to import changed inputs and rerun. This is a local developer command, not a hosted Excel-upload endpoint.
- The importer reads the named worksheet, maps headers, preserves IDs, checks synthetic contacts, rejects formulas in raw evidence, enforces numeric/date/boolean fields, limits archive size and rejects duplicate identities. The fixture's dates, Search scope and 55% baseline margin remain fixed. Current-period financial values, feedback, maturity and cohort consent can change. Maintain `Mature conversions = Eligible outcomes` for mature rows, or zero otherwise. Derived Excel columns are ignored on import; the OS recomputes decisions from raw evidence.

## Replay sequence

1. Validate exactly 100 isolated fixture identities and all normalized report and feedback contracts.
2. Enqueue and drain 100 baseline reports for September 19–October 3, 2026; capture personal recommendations at October 4.
3. Advance the simulation clock. Ingest 100 non-overlapping October 3–17 reports, then 100 customer feedback jobs at October 18.
4. Record personal-only estimates before any cohort contributions are enabled.
5. Opt 80 fictional accounts into aggregate contribution, then refresh all 100 estimates. Each account excludes itself from its cohort; contributors are clipped to equal maximum weight, with a maximum 20-observation prior.
6. Verify two applied source pages per account, deduplication of 200 repeated deliveries, one feedback event per account, empty job backlog, and no proposals or ad execution.
7. Export the traceable evidence. The cohort may inform all 100 accounts; only the 80 consented accounts contribute.

## Current replay result

400 jobs succeeded; no retries, failed jobs or pending jobs. Ten deteriorated-to-recovered cases changed from hold to an expansion recommendation; 80 adverse-evidence cases changed from expansion to hold; ten remained eligible. The pooled evidence changed all 100 quality estimates, while customer-specific gates retained control over spend recommendations. Actual spend was $0.

Ten scenarios each contain ten customers: recovery, stable growth, quality deterioration, falling revenue, tracking gaps, immature outcomes, missing margin, empty wallet, customer budget concerns, and uncertified marginal evidence. Fixture assertions check those expected directions; edited JSON replays retain the structural checks without asserting the original scenario outcome.

## Excel end-to-end verification

The delivered XLSX was imported through `replay:workbook`, producing the same input SHA-256 and all 100 final decisions as the original JSON replay. A disposable copy lowered SYN-001's revenue from $12,600 to $1,000; the real policy path changed its recommended increment from $700 to $0 and returned `repair_economics`. Duplicate customer IDs and formulas in raw evidence were rejected. Twenty-one targeted fixture/worker regression tests passed, including crash recovery, source cursor transactions, competing workers, lease loss, retry exhaustion, backpressure, tenant isolation and feedback-driven decisions. Evidence is recorded in `fixtures/customer-learning/workbook-verification.json`.

## Modularity and scaling boundary

Excel parsing is an independent adapter; normalized validation is separate from the runner. The runner feeds the existing job repository and worker, which invoke the OS repository and Mastra workflow. Learning and financial policy remain independent modules. Jobs drain in bounded batches of at most ten. Imports retain per-workspace identities, cursor order, receipts and deduplication.

This is a bounded 100-account fixture, not a production load test or an unbounded bulk importer. The existing queue has per-workspace backpressure and pilot retention limits. Production expansion still requires real provider adapters, durable orchestration storage, workload measurement, retention policies and load testing against the actual deployment. The Excel CLI needs Python 3 and Node; it does not run in the hosted browser or Cloudflare Worker.

## Assumptions and limits

The source site describes its highlights as selected work by the team behind Hellyeah. Marvel Snap's 3.6x first-quarter ROAS gives loose context for a profitable test range; Mavia's ROI and Truist's CAC examples supply additional acquisition/retention context. They are not used as individual observations or transferred forecasts. This fixture has equal 14-day periods, invented Search/USD account economics, a 55% known-margin assumption, a 5% illustrative fee, and fabricated marginal bounds. Public multi-channel game/app case results do not calibrate the Search model.

These checks show that data is accepted, deduplicated, recorded and used to revise recommendations. They do not demonstrate real ROI improvement, causal lift, production Google Ads execution, production database load capacity, or durable Mastra orchestration. No production data, enrolled workspace, sharing configuration, credential, ad or fund balance is changed by this runner.

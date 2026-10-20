import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { sqliteD1 } from "../tests/helpers/sqlite-d1.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { OSJobRepository } from "../src/os/job-repository.mjs";
import { drainJobs } from "../src/os/job-worker.mjs";
import { runGrowthLearning } from "../src/os/workflow.mjs";
import { optimizationFixtureConfig, mockTrial, mockTrialReport, mockDraftPort } from "../src/os/adapters/mock-optimization.mjs";
import { prepareOptimizationDraft } from "../src/os/adapters/campaign-draft-port.mjs";

// Deliberately synthetic, deterministic, isolated SQLite. No hosted writes or network calls.
const db = sqliteD1();
try {
  let now = "2026-10-01T00:00:00.000Z", key = 0;
  const repo = new OSRepository(db, { evaluate: runGrowthLearning, clock: () => now }), queue = new OSJobRepository(repo);
  const command = (org, kind, payload) => repo.execute({ organization_id: org, actor_id: "fixture:operator", key: `continuous-demo-${++key}`, command: { kind, payload } });
  const config = optimizationFixtureConfig(), designs = [];
  for (let i = 0; i < 7; i++) {
    const org = "fixture_continuous_" + i;
    await command(org, "optimization_configure", { expected_version: 0, config });
    const design = mockTrial(org); await command(org, "optimization_register", design); designs.push(design);
  }
  now = "2026-10-10T00:00:00.000Z";
  const enqueue = (design, report, suffix = "v1") => queue.enqueue({ organization_id: design.organization_id, actor_id: "fixture:reporting-service", key: `report-${design.organization_id}-${suffix}`, command: { kind: "optimization_batch", payload: { reports: [report] } } });
  for (const design of designs.slice(0, 6)) await enqueue(design, mockTrialReport(design));
  const firstDrain = await drainJobs(queue, { limit: 10 });
  assert.equal(firstDrain.succeeded, 6);
  const target = designs[6], org = target.organization_id;
  const context = async () => (await repo.load(org)).state.optimization.fixture;
  const strategy = c => c.model.strategies.find(s => s.strategy_id === "creative_proof");
  await command(org, "evaluate", {});
  const cold = strategy(await context());
  assert.equal(cold.network.participants, 6); assert.equal(cold.action, "collect_evidence");
  await enqueue(target, mockTrialReport(target)); assert.equal((await drainJobs(queue)).succeeded, 1);
  const learned = await context(), healthy = strategy(learned);
  assert.equal(healthy.action, "review_campaign_draft"); assert.ok(healthy.personal_weight > 0.99);
  await command(org, "optimization_propose", { source_mode: "fixture", strategy_id: "creative_proof", input_hash: learned.model.input_hash });
  const proposal = (await context()).proposals[0], port = mockDraftPort();
  const receipt = await prepareOptimizationDraft({ repository: repo, organization_id: org, source_mode: "fixture", proposal_id: proposal.id, port });
  const correction = mockTrialReport(target, { source_revision: 2, candidate: { units: 10000, qualified: 1000, contribution_sum_usd: -10000, acquisition_cost_usd: 10000 } });
  await enqueue(target, correction, "v2"); await enqueue(target, correction, "v2-duplicate");
  assert.equal((await drainJobs(queue)).succeeded, 2);
  const corrected = strategy(await context());
  assert.equal(corrected.action, "hold_or_retest"); assert.equal(corrected.personal_units, 10000);
  assert.equal((await context()).evidence_version, 2);
  await command(designs[0].organization_id, "optimization_configure", { expected_version: 1, config: { ...config, share_learning: false } });
  await command(org, "evaluate", {});
  assert.equal(strategy(await context()).network.participants, 5);
  await command(org, "wallet_intent", { source_mode: "fixture", amount_cents: 50000, currency: "USD", confirmed: true });
  const intent = (await repo.load(org)).state.wallet_growth.intents[0];
  const output = {
    synthetic: true, method: learned.model.method, orchestrator: learned.model.orchestrator,
    customers: designs.length, persisted_jobs_completed: 9,
    cold_start: { comparable_contributors: cold.network.participants, estimated_quality_lift: cold.estimated_quality_lift, action: cold.action },
    personal_win: { assigned_units_per_arm: healthy.personal_units, personal_weight: healthy.personal_weight,
      quality_improvement_lower: healthy.personal_quality_lower, contribution_improvement_lower_usd: healthy.contribution_lower_per_unit_usd, action: healthy.action },
    prepared_draft: { status: receipt.status, provider_writes: port.calls, reserved_micros: receipt.reserved_micros, launched: receipt.launched },
    corrected_loss: { action: corrected.action, active_units_per_arm: corrected.personal_units, evidence_version: (await context()).evidence_version },
    contributors_after_opt_out: strategy(await context()).network.participants,
    funding: { status: intent.status, amount_cents: intent.amount_cents, charged_cents: intent.charged_cents, credited_cents: intent.credited_cents, stripe_checkout_url: intent.stripe_checkout_url },
    external_network_calls: 0, real_outcome_improvement_proven: false,
  };
  const json = JSON.stringify(output, null, 2) + "\n";
  if (process.argv.includes("--write")) {
    const dir = new URL("../fixtures/continuous-learning/", import.meta.url); await mkdir(dir, { recursive: true }); await writeFile(new URL("verification.json", dir), json);
  }
  process.stdout.write(json);
} finally { db.close(); }

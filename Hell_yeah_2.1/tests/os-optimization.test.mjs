import test from "node:test";
import assert from "node:assert/strict";
import { sqliteD1 } from "./helpers/sqlite-d1.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { OSJobRepository } from "../src/os/job-repository.mjs";
import { drainJobs } from "../src/os/job-worker.mjs";
import { runGrowthLearning } from "../src/os/workflow.mjs";
import { optimizationFixtureConfig as config, mockTrial, mockTrialReport, mockDraftPort } from "../src/os/adapters/mock-optimization.mjs";
import { prepareOptimizationDraft } from "../src/os/adapters/campaign-draft-port.mjs";
import { handleOS } from "../src/os/http.mjs";
import { digest } from "../src/os/contracts.mjs";

function setup(t) {
  const db = sqliteD1(); t.after(() => db.close());
  let at = "2026-10-01T00:00:00.000Z", seq = 0;
  const repo = new OSRepository(db, { evaluate: runGrowthLearning, clock: () => at });
  const org = "fixture_optimization";
  const command = (kind, payload, organization_id = org, key = "test-command-" + (++seq)) => repo.execute({ organization_id, actor_id: "test:owner", key, command: { kind, payload } });
  const configure = (organization_id = org, overrides = {}, version = 0) => command("optimization_configure", { expected_version: version, config: config(overrides) }, organization_id);
  const register = (organization_id = org, overrides = {}) => {
    const design = mockTrial(organization_id, overrides);
    return command("optimization_register", design, organization_id).then(() => design);
  };
  const report = (design, overrides = {}) => command("optimization_report", mockTrialReport(design, overrides), design.organization_id);
  const context = async (organization_id = org, mode = "fixture") => (await repo.load(organization_id)).state.optimization[mode];
  const strategy = async (organization_id = org, mode = "fixture") => (await context(organization_id, mode)).model.strategies.find(s => s.strategy_id === "creative_proof");
  const propose = async () => { const c = await context(); await command("optimization_propose", { source_mode: "fixture", strategy_id: "creative_proof", input_hash: c.model.input_hash }); return (await context()).proposals.at(-1); };
  return { db, repo, org, command, configure, register, report, context, strategy, propose, setTime: time => { at = time; } };
}

test("trusted trial evidence updates Mastra; a corrected loss replaces a win and blocks stale drafts", async t => {
  const h = setup(t); await h.configure(); const design = await h.register();
  h.setTime("2026-10-10T00:00:00.000Z"); await h.report(design);
  const first = await h.context();
  assert.equal(first.model.orchestrator, "Mastra");
  assert.equal((await h.strategy()).action, "review_campaign_draft");
  assert.ok((await h.strategy()).contribution_lower_per_unit_usd > 0);
  const proposal = await h.propose();
  await h.report(design); // Same evidence under a different request key.
  assert.equal((await h.context()).evidence_version, 1);
  assert.equal((await h.strategy()).personal_units, 10000);
  await h.report(design, { source_revision: 2, candidate: { units: 10000, qualified: 1000, contribution_sum_usd: -10000, acquisition_cost_usd: 10000 } });
  assert.equal((await h.context()).evidence_version, 2);
  assert.equal((await h.strategy()).personal_units, 10000);
  assert.equal((await h.strategy()).action, "hold_or_retest");
  const port = mockDraftPort();
  await assert.rejects(prepareOptimizationDraft({ repository: h.repo, organization_id: h.org, source_mode: "fixture", proposal_id: proposal.id, port }), { code: "STALE_OPTIMIZATION" });
  assert.equal(port.calls, 0);
  await assert.rejects(h.report(design), { code: "STALE_REPORT" });
  await assert.rejects(h.report(design, { source_revision: 2 }), { code: "SOURCE_EVENT_CONFLICT" });
});

test("new trial must finish before a historical winner can earn another draft; late registration is rejected", async t => {
  const h = setup(t); await h.configure(); const first = await h.register();
  h.setTime("2026-10-10T00:00:00.000Z"); await h.report(first);
  assert.equal((await h.strategy()).action, "review_campaign_draft");
  await assert.rejects(h.register(h.org, { trial_id: "late" }), { code: "LATE_REGISTRATION" });
  await h.register(h.org, { trial_id: "next", registered_at: "2026-10-10T00:00:00.000Z", starts_at: "2026-10-11T00:00:00.000Z", ends_at: "2026-10-18T00:00:00.000Z", mature_after: "2026-10-19T00:00:00.000Z" });
  assert.equal((await h.strategy()).action, "hold_or_retest");
});

test("fixed cutoff, maturity, assignment and reward bounds are required; invalid inputs leave evidence unchanged", async t => {
  const h = setup(t); await h.configure(); const design = await h.register();
  await assert.rejects(h.register(h.org, { trial_id: "overlap" }), { code: "OVERLAPPING_TRIALS" });
  h.setTime("2026-10-10T00:00:00.000Z");
  await assert.rejects(h.report(design, { observed_at: "2026-10-09T00:00:00.000Z" }), { code: "OUTCOMES_IMMATURE" });
  await assert.rejects(h.report(design, { observed_at: "2026-10-11T00:00:00.000Z" }), { code: "REPORT_TIME" });
  await assert.rejects(h.report(design, { candidate: { units: 9999, qualified: 5000, contribution_sum_usd: 10000, acquisition_cost_usd: 10000 } }), { code: "FIXED_HORIZON" });
  await assert.rejects(h.report(design, { candidate: { units: 10000, qualified: 5000, contribution_sum_usd: 100001, acquisition_cost_usd: 10000 } }), { code: "REWARD_BOUND" });
  assert.equal((await h.context()).evidence_version, 0);
  for (const [index, flag] of ["assignment_verified", "tracker_verified", "bounds_verified"].entries()) {
    await h.report(design, { source_revision: index + 1, [flag]: false });
    assert.equal((await h.strategy()).action, "collect_evidence");
  }
  await h.report(design, { source_revision: 4, guardrail_violation: true });
  assert.equal((await h.strategy()).action, "collect_evidence");
});

test("network learning needs five OTHER opted-in matching accounts and cannot certify a cold-start promotion", async t => {
  const h = setup(t), designs = [];
  for (let i = 0; i < 6; i++) {
    const org = "fixture_peer_" + i; await h.configure(org); designs.push(await h.register(org));
  }
  await h.configure(); const personal = await h.register();
  await h.configure("fixture_live", { source_mode: "live" });
  await h.configure("fixture_other_country", { country: "CA" });
  h.setTime("2026-10-10T00:00:00.000Z");
  for (const d of designs.slice(0, 4)) await h.report(d);
  await h.command("evaluate", {}); assert.equal((await h.strategy()).network.available, false);
  await h.report(designs[4]); await h.command("evaluate", {});
  const s = await h.strategy(); assert.equal(s.network.participants, 5); assert.equal(s.prior_strength, 20);
  assert.ok(s.estimated_quality_lift > 0); assert.equal(s.action, "collect_evidence");
  await h.command("evaluate", {}, "fixture_peer_0"); assert.equal((await h.strategy("fixture_peer_0")).network.available, false);
  await h.report(personal, { candidate: { units: 10000, qualified: 1000, contribution_sum_usd: -10000, acquisition_cost_usd: 10000 } });
  assert.equal((await h.strategy()).action, "hold_or_retest");
  assert.ok((await h.strategy()).personal_weight > 0.99);
  assert.ok((await h.strategy()).estimated_quality_lift < 0);
  await h.command("evaluate", {}, "fixture_live"); assert.equal((await h.strategy("fixture_live", "live")).network.available, false);
  await h.command("evaluate", {}, "fixture_other_country"); assert.equal((await h.strategy("fixture_other_country")).network.available, false);
  await h.configure("fixture_peer_0", { share_learning: false }, 1);
  await h.command("evaluate", {}); assert.equal((await h.strategy()).network.available, false);
  assert.equal(h.db.sqlite.prepare("SELECT COUNT(*) n FROM os_strategy_contributions WHERE organization_id='fixture_peer_0'").get().n, 0);
  await h.report(designs[5]); await h.command("evaluate", {}); assert.equal((await h.strategy()).network.participants, 5);
  await h.configure(h.org, { share_learning: false }, 1); assert.equal((await h.strategy()).network.available, false);
});

test("material customer feedback vetoes winning data and resolving it restores eligibility", async t => {
  const h = setup(t); await h.configure(); const design = await h.register(); h.setTime(design.mature_after); await h.report(design);
  await h.command("feedback", { source: "customer", external_id: "quality-concern", category: "lead_quality", polarity: "negative", severity: "medium", text: "The leads are outside our service area." });
  assert.equal((await h.strategy()).action, "hold_or_retest");
  const f = (await h.repo.load(h.org)).state.feedback[0];
  await h.command("resolve_feedback", { id: f.id, note: "Confirmed the exclusion rules and reviewed corrected lead outcomes." });
  assert.equal((await h.strategy()).action, "review_campaign_draft");
});

test("draft handoff recovers a lost provider acknowledgement without another write or reservation", async t => {
  const h = setup(t); await h.configure(); const d = await h.register(); h.setTime(d.mature_after); await h.report(d);
  const p = await h.propose(), port = mockDraftPort(); port.lostAcknowledgement = true;
  const args = { repository: h.repo, organization_id: h.org, source_mode: "fixture", proposal_id: p.id, port };
  await assert.rejects(prepareOptimizationDraft(args), /acknowledgement/);
  const receipt = await prepareOptimizationDraft(args);
  assert.equal(receipt.reserved_micros, 0); assert.equal(receipt.launched, false); assert.equal(port.calls, 1);
  assert.deepEqual(await prepareOptimizationDraft(args), receipt); assert.equal(port.calls, 1);
  assert.equal((await h.context()).proposals[0].status, "Draft prepared");
  assert.equal(p.plan.existing_budget_micros, p.plan.requested_budget_micros);
});

test("HTTP restricts outcome authority; durable job ingestion survives closed dashboards", async t => {
  const h = setup(t), uid = "optimization-http", org = "org_" + digest(uid).slice(0, 32), key = "test-service-key-with-at-least-32-characters";
  await h.configure(org); const d = await h.register(org); h.setTime(d.mature_after);
  const req = (kind, payload, service, path = "/api/os") => new Request("https://os.test" + path, { method: "POST", headers: {
    "content-type": "application/json", origin: "https://os.test", "idempotency-key": "http-" + kind,
    ...(service ? { "x-hy-service-key": key, "x-hy-workspace": org } : { "oai-authenticated-user-id": uid }),
  }, body: JSON.stringify({ kind, payload }) });
  assert.equal((await handleOS(req("optimization_report", mockTrialReport(d), false), { repository: h.repo, serviceKey: key })).status, 403);
  assert.equal((await handleOS(req("optimization_batch", { reports: [mockTrialReport(d)] }, false, "/api/os/jobs"), { repository: h.repo, serviceKey: key })).status, 403);
  const queued = await handleOS(req("optimization_batch", { reports: [mockTrialReport(d)] }, true, "/api/os/jobs"), { repository: h.repo, serviceKey: key });
  assert.equal(queued.status, 202);
  assert.equal((await drainJobs(new OSJobRepository(h.repo))).succeeded, 1);
  assert.equal((await h.strategy(org)).action, "review_campaign_draft");
  const model = (await h.context(org)).model;
  assert.equal((await handleOS(req("optimization_propose", { source_mode: "fixture", strategy_id: "creative_proof", input_hash: model.input_hash }, false), { repository: h.repo })).status, 200);
  const proposal = (await h.context(org)).proposals[0], draftPort = mockDraftPort();
  const handoff = await handleOS(req("optimization_prepare_draft", { source_mode: "fixture", proposal_id: proposal.id }, false), { repository: h.repo, draftPort });
  assert.equal(handoff.status, 200); assert.equal(draftPort.calls, 1);
  assert.equal((await handoff.json()).state.optimization.fixture.proposals[0].receipt.launched, false);
  const cross = mockTrialReport(d, { organization_id: "fixture_foreign" });
  assert.equal((await handleOS(req("optimization_report", cross, true), { repository: h.repo, serviceKey: key })).status, 403);
});

test("the return floor uses a conservative personal ROI bound and stale evidence expires", async t => {
  const h = setup(t); await h.configure(h.org, { min_roi_bps: 50000 }); const d = await h.register();
  h.setTime(d.mature_after); await h.report(d, { candidate: { units: 10000, qualified: 7000, contribution_sum_usd: 51000, acquisition_cost_usd: 10000 } });
  const s = await h.strategy(); assert.ok(s.candidate_roi > 5); assert.ok(s.candidate_roi_lower < 5);
  assert.equal(s.action, "hold_or_retest");
  h.setTime("2027-01-10T00:00:00.000Z"); await h.command("evaluate", {});
  assert.equal((await h.strategy()).personal_units, 0);
  assert.equal(h.db.sqlite.prepare("SELECT COUNT(*) n FROM os_strategy_contributions").get().n, 0);
});

test("transaction rollback cannot leave network statistics ahead of personal evidence", async t => {
  const h = setup(t); await h.configure(); const d = await h.register(); h.setTime(d.mature_after);
  const batch = h.db.batch;
  h.db.batch = statements => batch([...statements, h.db.prepare("INSERT INTO os_workspaces(organization_id) VALUES(?)").bind("invalid")]);
  await assert.rejects(h.report(d));
  assert.equal((await h.context()).evidence_version, 0);
  assert.equal(h.db.sqlite.prepare("SELECT COUNT(*) n FROM os_strategy_contributions").get().n, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, queueScenario, submitApproval, transitionExperiment, readState, saveState, readiness, createExperiment } from "../web/js/model.mjs";
import { startDemo, demoContext, approveDemoCampaign, designDemoExperiment, completeDemoExperiment, prepareDemoLearning, learningForExperiment, finishDemoAsset } from "../web/js/demo-model.mjs";
import { experimentDialog } from "../web/js/views.mjs";
import { productProposal } from "../web/js/product-proposals.mjs";
import { proposalSchema } from "../src/os/proposals.mjs";
import { runProductDemo } from "../src/os/product-demo.mjs";
import { runGrowthLearning } from "../src/os/workflow.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { handleOS } from "../src/os/http.mjs";
import { sqliteD1 } from "./helpers/sqlite-d1.mjs";

const at = "2026-10-19T00:00:00.000Z";
test("Performance Max cannot pass readiness with images but missing copy", () => {
  const s=createInitialState(), a=s.assets[0];
  Object.assign(a,{landscape:true,square:true,textReady:false});
  assert.equal(readiness(s,"Performance Max","conversions",a.id).every(g=>g.ok),false);
});
test("experiment creative content and version remain pinned after a Studio revision", () => {
  const s=createInitialState();
  const e=createExperiment(s,{name:"Pinned creative",hypothesis:"A clearer benefit may improve purchase rate.",assetId:"a5"});
  const snapshot=structuredClone(e.creativeSnapshot);
  finishDemoAsset(s,"a5");
  assert.equal(s.assets.find(a=>a.id==="a5").version,2);
  assert.equal(e.creativeVersion,1);
  assert.deepEqual(e.creativeSnapshot,snapshot);
  assert.ok(experimentDialog(s,e).includes(`${snapshot.name} · v1`));
});
test("learning from an archived experiment keeps its original recipe and active campaign", () => {
  const { s,e }=planned(); completeDemoExperiment(s,e.id,"healthy");
  s.wallet.available += 500;
  const original=prepareDemoLearning(s);
  startDemo(s,{assetId:"a1",budget:1000,days:7});
  const approval=queueScenario(s,s.demoJourney.scenarioId); submitApproval(s,approval.id,true);
  const active=structuredClone(s.demoJourney);
  s.assets[0].version++; s.brand.version++; s.wallet.available+=500;
  assert.deepEqual(learningForExperiment(s,e.id),original);
  assert.deepEqual(s.demoJourney,active);
});
function planned() {
  const s = createInitialState();
  startDemo(s);
  const a = queueScenario(s, s.demoJourney.scenarioId);
  const c = submitApproval(s, a.id, true);
  approveDemoCampaign(s, c.id);
  const e = designDemoExperiment(s);
  transitionExperiment(s, e.id);
  return { s, c, e };
}
function setup(t) {
  const db = sqliteD1(); t.after(() => db.close());
  return { db, repository: new OSRepository(db, { evaluate: runGrowthLearning, clock: () => at }) };
}
test("connected demo reserves and settles once, keeps the creative lineage, and resumes from storage", () => {
  const { s, c, e } = planned(), balance = structuredClone(s.wallet);
  assert.equal(s.wallet.available, 9000); assert.equal(s.wallet.reserved, 11500);
  assert.equal(e.assetId, s.demoJourney.creative.id); assert.equal(e.demoCampaignId, c.id);
  const evidence = completeDemoExperiment(s, e.id, "healthy");
  assert.equal(c.status, "Completed"); assert.equal(e.status, "Concluded");
  assert.equal(s.wallet.available, 9600); assert.equal(s.wallet.reserved, 8500);
  assert.equal(s.wallet.spent, balance.spent + 2400);
  assert.equal(c.purchases, e.controlConversions + e.treatmentConversions);
  assert.equal(evidence.spend_micros, c.spend * 1e6);
  const settled = structuredClone(s.wallet);
  completeDemoExperiment(s, e.id, "healthy"); assert.deepEqual(s.wallet, settled);
  assert.throws(() => completeDemoExperiment(s, e.id, "poor"), /complete/);
  const payload = prepareDemoLearning(s);
  s.wallet.available += 5000;
  assert.deepEqual(prepareDemoLearning(s), payload, "retry keeps the original funding context");
  let data; const storage = { setItem: (_, value) => { data = value; }, getItem: () => data };
  saveState(storage, s); const restored = readState(storage);
  assert.equal(restored.recovered, false); assert.equal(demoContext(restored.state).step, 4);
  assert.deepEqual(prepareDemoLearning(restored.state), payload);
});
test("paused campaigns and experiments cannot generate spend; an active demo cannot be silently replaced", () => {
  const { s, c, e } = planned(), before = structuredClone(s.wallet);
  assert.throws(() => startDemo(s), /Finish the current/);
  c.status = "Paused"; assert.throws(() => completeDemoExperiment(s, e.id, "healthy"), /Resume/);
  c.status = "Serving"; transitionExperiment(s, e.id);
  assert.throws(() => completeDemoExperiment(s, e.id, "healthy"), /Start or resume/);
  assert.deepEqual(s.wallet, before);
});
for (const outcome of ["healthy", "poor", "limited"]) {
  test(`same ${outcome} evidence completes UI → repository → Mastra without changing the owner's economic snapshot`, async t => {
    const { repository, db } = setup(t), { s, c, e } = planned();
    completeDemoExperiment(s, e.id, outcome);
    const payload = prepareDemoLearning(s), owner = "fixture_owner";
    const previous = await repository.ensureWorkspace(owner);
    const request = { repository, actor_id: "test-owner", organization_id: owner, key: `demo-${outcome}-test`, payload };
    const response = await runProductDemo(request), r = response.state.demo_runs[0];
    assert.deepEqual(r.input, payload); assert.deepEqual(r.evidence, e.sampleEvidence);
    assert.equal(r.input.campaign_id, c.id); assert.equal(r.before.increment_micros, 0);
    assert.equal(r.after.orchestrator, "Mastra"); assert.equal(r.active_outcome_windows, 1);
    assert.equal(r.after.increment_micros, outcome === "healthy" ? 300e6 : 0);
    assert.equal(r.after.type, outcome === "healthy" ? "bounded_expansion" : outcome === "poor" ? "repair_economics" : "hold_for_evidence");
    assert.deepEqual(response.state.snapshot, previous.state.snapshot);
    assert.equal(response.state.learning.observations.length, 0);
    assert.equal(response.state.learning.opt_in, false);
    assert.equal(r.spend_authority, false); assert.equal(r.network_enrolled, false);
    const replay = await runProductDemo(request);
    assert.equal(replay.replayed, true); assert.equal(replay.revision, response.revision);
    assert.equal(replay.state.demo_runs.length, 1);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM os_cohort_contributions").get().n, 0);
    await assert.rejects(() => runProductDemo({ ...request, payload: { ...payload, outcome: outcome === "poor" ? "healthy" : "poor" } }), { code: "IDEMPOTENCY_CONFLICT" });
  });
}
test("a failed final save can be retried without duplicating source evidence", async t => {
  const { repository } = setup(t), { s, e } = planned();
  completeDemoExperiment(s, e.id, "healthy");
  const request = { repository, actor_id: "test", organization_id: "fixture_retry", key: "demo-retry-test", payload: prepareDemoLearning(s) };
  const execute = repository.execute.bind(repository); let failOnce = true;
  repository.execute = async params => {
    if (params.command.kind === "record_product_demo" && failOnce) { failOnce = false; throw new Error("simulated interrupted response"); }
    return execute(params);
  };
  await assert.rejects(() => runProductDemo(request), /interrupted/);
  const response = await runProductDemo(request);
  assert.equal(response.state.demo_runs[0].active_outcome_windows, 1);
  assert.equal(response.state.demo_runs[0].after.increment_micros, 300e6);
});
test("the HTTP demo endpoint accepts only a synthetic recipe and never browser-provided economic results", async t => {
  const { repository } = setup(t), { s, e } = planned(); completeDemoExperiment(s, e.id, "healthy");
  const payload = prepareDemoLearning(s);
  const send = (kind, body, authenticated = true) => handleOS(new Request("https://os.test/api/os", { method: "POST", headers: { "content-type": "application/json", origin: "https://os.test", "idempotency-key": "demo-http-test", ...(authenticated ? { "oai-authenticated-user-id": "test-user" } : {}) }, body: JSON.stringify({ kind, payload: body }) }), { repository });
  assert.equal((await send("product_demo", payload, false)).status, 401);
  assert.equal((await send("product_demo", { ...payload, net_revenue_micros: 9999999999 })).status, 400);
  assert.equal((await send("record_product_demo", { result: {} })).status, 400);
  const response = await send("product_demo", payload); assert.equal(response.status, 200);
  const data = await response.json(); assert.equal(data.state.demo_runs[0].evidence.net_revenue_micros, 9600e6);
});
test("Performance Max research snapshots use the server's PMax channel contract", () => {
  const s = createInitialState(); startDemo(s);
  s.scenarios[0].draft.channel = "Performance Max";
  const proposal = productProposal(s, "simulator", s.scenarios[0].id);
  assert.equal(proposal.data.channel, "PMax"); assert.ok(proposalSchema.safeParse(proposal).success);
});

import test from "node:test";
import assert from "node:assert/strict";
import { MockGoogleCampaign } from "../src/os/adapters/mock-google.mjs";
import { runMockCampaignTrial } from "../src/os/mock-campaign-trial.mjs";
import { runGrowthLearning } from "../src/os/workflow.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { sqliteD1 } from "./helpers/sqlite-d1.mjs";
import {
  initialOS,
  applyCommand,
  evaluateGrowth,
  ORG,
} from "../src/os/kernel.mjs";
import { learnCustomer } from "../src/os/learning.mjs";
const at = "2026-10-19T00:00:00.000Z",
  ctx = {
    at,
    actor_id: "test-owner",
    organization_id: ORG,
    operation_id: "source-test",
  };
test("loading demonstration outcomes never replaces ingested source evidence", () => {
  const s = initialOS(at);
  applyCommand(s, { kind: "learning_sample", payload: {} }, ctx);
  assert.equal(s.learning.observations.length, 12);
  applyCommand(s, { kind: "source_report", payload: source().report() }, ctx);
  assert.equal(
    s.learning.observations.length,
    1,
    "Trusted source report displaces demonstration history",
  );
  const before = structuredClone(s.learning);
  assert.throws(
    () => applyCommand(s, { kind: "learning_sample", payload: {} }, ctx),
    /ingested outcomes/,
  );
  assert.deepEqual(s.learning, before);
  const financial = structuredClone(s.snapshot);
  assert.throws(
    () =>
      applyCommand(
        s,
        { kind: "sample", payload: { name: "scale_ready" } },
        ctx,
      ),
    /source-owned financial facts/,
  );
  assert.deepEqual(s.snapshot, financial);
});
test("zero-outcome reports update financial facts without inventing positive quality evidence", () => {
  const s = initialOS(at),
    report = source().report();
  applyCommand(
    s,
    {
      kind: "source_report",
      payload: {
        ...report,
        eligible: 0,
        qualified: 0,
        mature_conversions: 0,
        net_revenue_micros: 0,
      },
    },
    ctx,
  );
  s.learning.model = learnCustomer(s, undefined, at);
  assert.equal(s.learning.model.weighted_observations, 0);
  assert.equal(s.snapshot.net_revenue_micros, 0);
  assert.equal(evaluateGrowth(s, { at }).chosen.increment_micros, 0);
});
function source() {
  const c = new MockGoogleCampaign({ organization_id: ORG, at });
  c.submit("launch-1");
  c.serve("launch-1");
  return c;
}
function repo(t, evaluate = runGrowthLearning) {
  const db = sqliteD1();
  t.after(() => db.close());
  return {
    db,
    repository: new OSRepository(db, { evaluate, clock: () => at }),
  };
}
test("mock managed campaign reserves once, requires source review, and reconciles spend", () => {
  const c = new MockGoogleCampaign({ organization_id: ORG, at });
  assert.throws(() => c.report(), /before review/);
  c.submit("launch-1");
  const w = structuredClone(c.source.fixture.wallet);
  c.submit("launch-1");
  assert.deepEqual(c.source.fixture.wallet, w);
  assert.equal(c.source.fixture.campaign.state, "In Review");
  c.serve("launch-1");
  c.report();
  assert.equal(c.source.fixture.wallet.spent_micros, 18_462_000_000);
  assert.equal(c.source.fixture.wallet.reserved_micros, 1_538_000_000);
  assert.equal(c.source.fixture.wallet.available_micros, 80_000_000_000);
});
test("source correction replaces prior training facts and reverses the recommendation", () => {
  const s = initialOS(at),
    c = source(),
    p = c.report();
  applyCommand(s, { kind: "source_report", payload: p }, ctx);
  s.learning.model = learnCustomer(s, undefined, at);
  const good = evaluateGrowth(s, { at });
  assert.equal(good.chosen.increment_micros, 2e9);
  const duplicate = applyCommand(s, { kind: "source_report", payload: p }, ctx);
  assert.equal(duplicate.reevaluate, false);
  assert.equal(s.learning.observations.length, 1);
  applyCommand(
    s,
    {
      kind: "source_report",
      payload: c.report({ revision: 2, quality: "poor" }),
    },
    ctx,
  );
  s.learning.model = learnCustomer(s, undefined, at);
  const bad = evaluateGrowth(s, { at });
  assert.equal(bad.chosen.increment_micros, 0);
  assert.equal(s.learning.model.mature_rows, 1);
  assert.equal(s.learning.observations.filter((x) => !x.superseded).length, 1);
  assert.ok(s.learning.model.qualification.mean < 0.15);
});
test("stale or conflicting revisions, overlapping windows and cross-workspace reports are rejected", () => {
  const c = source(),
    p = c.report({ revision: 2 }),
    s = initialOS(at);
  applyCommand(s, { kind: "source_report", payload: p }, ctx);
  assert.throws(
    () =>
      applyCommand(
        s,
        { kind: "source_report", payload: { ...p, source_revision: 1 } },
        ctx,
      ),
    /older/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        { kind: "source_report", payload: { ...p, qualified: 100 } },
        ctx,
      ),
    /different values/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          kind: "source_report",
          payload: { ...p, period_start: "2026-10-01T00:00:00.000Z" },
        },
        ctx,
      ),
    /non-overlapping/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          kind: "source_report",
          payload: { ...p, organization_id: "fixture_someone_else" },
        },
        ctx,
      ),
    /another workspace/,
  );
});
test("newly delivered stale reporting window cannot masquerade as fresh economic evidence", () => {
  const c = source(),
    p = c.report(),
    s = initialOS(at);
  p.period_start = "2026-08-01T00:00:00.000Z";
  p.period_end = "2026-09-01T00:00:00.000Z";
  applyCommand(s, { kind: "source_report", payload: p }, ctx);
  assert.equal(
    evaluateGrowth(s, { at }).gates.find((g) => g.key === "freshness").pass,
    false,
  );
  assert.equal(evaluateGrowth(s, { at }).chosen.increment_micros, 0);
});
test("end-to-end mock campaign uses real Mastra, D1 transactions and revised source outcomes", async (t) => {
  const { repository, db } = repo(t);
  const args = {
    repository,
    actor_id: "test-owner",
    organization_id: ORG,
    key: "mock-trial-001",
  };
  const result = await runMockCampaignTrial(args);
  const trial = result.state.last_mock_trial;
  assert.equal(trial.passed, true);
  assert.equal(trial.network_calls, 0);
  assert.equal(trial.healthy.orchestrator, "Mastra");
  assert.equal(trial.corrected.orchestrator, "Mastra");
  assert.equal(trial.healthy.increment_micros, 2e9);
  assert.equal(trial.corrected.increment_micros, 0);
  assert.equal(
    result.state.source_reports,
    undefined,
    "trial does not contaminate user evidence",
  );
  const operations = db.sqlite
    .prepare("SELECT count(*) n FROM os_operations")
    .get().n;
  const retry = await runMockCampaignTrial(args);
  assert.equal(retry.replayed, true);
  assert.equal(
    db.sqlite.prepare("SELECT count(*) n FROM os_operations").get().n,
    operations,
  );
  assert.equal(retry.state.last_mock_trial.id, trial.id);
});
test("compact receipts stay bounded and retries return the current workspace without duplicate effects", async (t) => {
  const { repository, db } = repo(t, async (s, c) =>
    evaluateGrowth(s, { at: c.at, runId: c.operation_id }),
  );
  const args = { actor_id: "owner", organization_id: ORG };
  await repository.execute({
    ...args,
    key: "receipt-eval-001",
    command: { kind: "evaluate", payload: {} },
  });
  await repository.execute({
    ...args,
    key: "receipt-eval-002",
    command: { kind: "evaluate", payload: {} },
  });
  const retry = await repository.execute({
    ...args,
    key: "receipt-eval-001",
    command: { kind: "evaluate", payload: {} },
  });
  assert.equal(retry.revision, 2);
  assert.equal(retry.receipt.committed_revision, 1);
  assert.equal(retry.state.decisions.length, 2);
  const rows = db.sqlite
    .prepare("SELECT response_json FROM os_operations")
    .all();
  assert.ok(rows.every((x) => Buffer.byteLength(x.response_json) < 512));
});
test("same-key conflicting concurrent requests cannot write losing cohort data", async (t) => {
  let calls = 0,
    release;
  const gate = new Promise((r) => (release = r));
  const { repository } = repo(t, async (s, c) => {
    if (++calls <= 2) {
      if (calls === 2) release();
      await gate;
    }
    return evaluateGrowth(s, { at: c.at, runId: c.operation_id });
  });
  const a = {
    actor_id: "owner",
    organization_id: ORG,
    key: "same-conflict-key",
  };
  const results = await Promise.allSettled([
    repository.execute({
      ...a,
      command: {
        kind: "policy",
        payload: {
          expected_version: 1,
          policy: { ...initialOS(at).policy, cash_capacity_micros: 0 },
        },
      },
    }),
    repository.execute({
      ...a,
      command: { kind: "sample", payload: { name: "scale_ready" } },
    }),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(results.filter((x) => x.status === "rejected").length, 1);
  const s = await repository.load();
  assert.equal(s.revision, 1);
  assert.equal((await repository.audit()).length, 2);
});

test("concurrent duplicate mock campaigns use one persisted clock and one final result", async (t) => {
  const db = sqliteD1();
  t.after(() => db.close());
  let tick = Date.parse(at);
  const repository = new OSRepository(db, {
    clock: () => new Date(tick++).toISOString(),
    evaluate: runGrowthLearning,
  });
  const args = {
    repository,
    actor_id: "owner",
    organization_id: ORG,
    key: "concurrent-mock-campaign",
  };
  const results = await Promise.all([
    runMockCampaignTrial(args),
    runMockCampaignTrial(args),
  ]);
  assert.ok(results.every((r) => r.state.last_mock_trial.passed));
  assert.equal(
    results[0].state.last_mock_trial.id,
    results[1].state.last_mock_trial.id,
  );
  assert.equal(
    db.sqlite
      .prepare("SELECT count(*) n FROM os_operations WHERE organization_id=?")
      .get(ORG).n,
    1,
  );
});

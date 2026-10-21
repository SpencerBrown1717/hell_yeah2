import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  simulateDraft,
  saveScenario,
  queueScenario,
  submitApproval,
  createExperiment,
  transitionExperiment,
  readiness,
  updateBrand,
  readState,
  saveState,
  STORAGE_KEY,
} from "../web/js/model.mjs";
const draft = {
  budget: 3000,
  days: 14,
  channel: "Search",
  goal: "conversions",
  assetId: "a1",
};
function pending(s = createInitialState()) {
  const scenario = saveScenario(s, draft, simulateDraft(draft));
  return { s, scenario, a: queueScenario(s, scenario.id) };
}
test("seeded planning output is repeatable and explicitly uncalibrated", () => {
  const a = simulateDraft(draft);
  assert.deepEqual(a, simulateDraft(draft));
  assert.equal(a.calibrated, false);
  assert.ok(a.low < a.expected && a.expected < a.high);
});
test("unsupported prediction scopes preserve a budget plan without invented conversions", () => {
  for (const change of [
    { channel: "Performance Max" },
    { goal: "impressions" },
  ]) {
    const result = simulateDraft({ ...draft, ...change });
    assert.equal(result.planningOnly, true);
    assert.equal(result.expected, undefined);
  }
});
test("invalid budgets and durations fail before producing a plan", () => {
  for (const change of [
    { budget: NaN },
    { budget: -100 },
    { budget: 25001 },
    { days: 0 },
    { days: 3.5 },
  ])
    assert.throws(() => simulateDraft({ ...draft, ...change }));
});
test("editing a scenario prevents saving the old result", () => {
  const s = createInitialState();
  assert.throws(
    () => saveScenario(s, { ...draft, budget: 4000 }, simulateDraft(draft)),
    /Inputs changed/,
  );
  assert.equal(s.scenarios.length, 0);
});
test("submission reserves exactly once, preserves a snapshot, and enters review", () => {
  const { s, a } = pending(),
    before = s.wallet.available;
  const c = submitApproval(s, a.id, true);
  assert.equal(c.status, "In Review");
  assert.equal(s.wallet.available, before - 3000);
  assert.equal(s.wallet.reserved, 11500);
  const again = submitApproval(s, a.id, true);
  assert.equal(again.id, c.id);
  assert.equal(s.wallet.available, before - 3000);
  s.brand.name = "Changed";
  assert.equal(c.snapshot.brandVersion, 1);
});
test("queuing the same saved scenario is idempotent", () => {
  const { s, a, scenario } = pending();
  assert.equal(queueScenario(s, scenario.id).id, a.id);
  assert.equal(s.approvals.length, 1);
});
test("explicit confirmation, tracking, balance and pause gate demo submission", () => {
  for (const [setup, confirmed, reason] of [
    [(s) => {}, false, /Confirm/],
    [(s) => (s.tracker.verified = false), true, /X-Ray/],
    [(s) => (s.wallet.available = 1), true, /Insufficient/],
    [(s) => (s.autonomyPaused = true), true, /paused/],
  ]) {
    const { s, a } = pending();
    setup(s);
    const wallet = structuredClone(s.wallet);
    assert.throws(() => submitApproval(s, a.id, confirmed), reason);
    assert.deepEqual(s.wallet, wallet);
    assert.equal(a.status, "Pending");
  }
});
test("brand and creative changes invalidate pending approvals", () => {
  for (const field of ["brand", "creative"]) {
    const { s, a } = pending();
    if (field === "brand") s.brand.version++;
    else s.assets[0].version++;
    assert.throws(() => submitApproval(s, a.id, true), /changed/);
  }
});
test("Search and PMax preserve channel-specific asset readiness", () => {
  const s = createInitialState();
  assert.ok(readiness(s, "Search", "conversions", "a4").every((g) => g.ok));
  assert.ok(
    readiness(s, "Performance Max", "conversions", "a4").some((g) => !g.ok),
  );
  s.tracker.enabled = false;
  assert.ok(readiness(s, "Search", "impressions", "a4").every((g) => g.ok));
});
test("experiments begin as Draft, start explicitly, pause, and retain no invented observations", () => {
  const s = createInitialState();
  const e = createExperiment(s, {
    name: "Benefit test",
    hypothesis: "A clearer benefit may improve purchase rates.",
    assetId: "a1",
  });
  assert.equal(e.status, "Draft");
  transitionExperiment(s, e.id);
  assert.equal(e.status, "Running");
  assert.equal(e.control, 0);
  transitionExperiment(s, e.id);
  assert.equal(e.status, "Paused");
  transitionExperiment(s, e.id);
  assert.equal(e.status, "Running");
});
test("concluded experiment cannot restart; incomplete tracking blocks starts", () => {
  const s = createInitialState();
  assert.throws(() => transitionExperiment(s, "e3"), /immutable/);
  s.tracker.receiving = false;
  assert.throws(() => transitionExperiment(s, "e2"), /readiness/);
});
test("brand website accepts only secure web URLs", () => {
  const s = createInitialState();
  assert.throws(
    () =>
      updateBrand(s, {
        name: "Test",
        website: "javascript:alert(1)",
        tagline: "",
      }),
    /https/,
  );
  updateBrand(s, {
    name: "New Forma",
    website: "https://example.com",
    tagline: "Good things.",
  });
  assert.equal(s.brand.version, 2);
});
test("local persistence survives reload; corrupt data recovers without a broken workspace", () => {
  const map = new Map(),
    storage = { getItem: (k) => map.get(k), setItem: (k, v) => map.set(k, v) };
  const { s } = pending();
  saveState(storage, s);
  assert.deepEqual(readState(storage).state, s);
  map.set(STORAGE_KEY, "{broken");
  assert.equal(readState(storage).recovered, true);
  map.set(STORAGE_KEY, JSON.stringify({ ...s, wallet: { available: -1 } }));
  assert.equal(readState(storage).recovered, true);
});

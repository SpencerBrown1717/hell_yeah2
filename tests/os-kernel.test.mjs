import test from "node:test";
import assert from "node:assert/strict";
import {
  initialOS,
  applyCommand,
  evaluateGrowth,
  sampleSnapshot,
  policyDefaults,
  ORG,
} from "../src/os/kernel.mjs";
import {
  learnCustomer,
  aggregateCohort,
  contributionFor,
  sampleLearning,
  benchmarkPolicies,
  sampleBenchmark,
  COHORT,
} from "../src/os/learning.mjs";
const at = "2026-10-19T00:00:00.000Z",
  ctx = {
    at,
    actor_id: "owner",
    organization_id: ORG,
    operation_id: "kernel_test",
  },
  evaluate = (s) => evaluateGrowth(s, { at, runId: "test" });
const ready = () => {
  const s = initialOS(at);
  s.snapshot = sampleSnapshot("scale_ready", at);
  return s;
};
const fb = (text = "Customers are outside our service area") => ({
  source: "customer",
  external_id: "survey-1",
  category: "lead_quality",
  polarity: "negative",
  severity: "medium",
  text,
});
function record(s) {
  const d = evaluate(s);
  s.decisions.unshift(d);
  s.latest = structuredClone(d);
  return d;
}
test("ROI kernel ranks bounded options and keeps zero-spend candidate", () => {
  const d = evaluate(ready());
  assert.equal(d.chosen.increment_micros, 2e9);
  assert.equal(d.chosen.lower_contribution_micros, 870e6);
  assert.ok(d.gates.every((g) => g.pass));
  assert.equal(d.candidates[0].increment_micros, 0);
  assert.equal(d.economics.contribution_micros, 14_714_900_000);
});
test("missing marginal evidence, bad economics and tracking failure cannot scale", () => {
  for (const name of ["baseline", "poor_returns", "tracking_gap"]) {
    const s = initialOS(at);
    s.snapshot = sampleSnapshot(name, at);
    assert.equal(evaluate(s).chosen.increment_micros, 0, name);
  }
});
test("unknown margin holds with unknown financial quantities", () => {
  const s = ready();
  s.snapshot.margin_bps = null;
  const d = evaluate(s);
  assert.equal(d.economics.roi_bps, null);
  assert.equal(d.economics.contribution_micros, null);
  assert.equal(d.chosen.increment_micros, 0);
});
test("feedback blocks growth, repeated source IDs dedupe, resolution restores eligibility", () => {
  const s = ready();
  applyCommand(s, { kind: "feedback", payload: fb() }, ctx);
  applyCommand(s, { kind: "feedback", payload: fb() }, ctx);
  assert.equal(s.feedback.length, 1);
  assert.equal(evaluate(s).type, "resolve_feedback");
  assert.throws(
    () =>
      applyCommand(
        s,
        { kind: "feedback", payload: fb("Changed content") },
        ctx,
      ),
    /different content/,
  );
  applyCommand(
    s,
    {
      kind: "resolve_feedback",
      payload: {
        id: s.feedback[0].id,
        note: "Targeting updated and customer concern reviewed.",
      },
    },
    ctx,
  );
  assert.equal(evaluate(s).type, "bounded_expansion");
});
test("positive comments never change measured return or marginal certification", () => {
  const s = initialOS(at),
    before = evaluate(s);
  applyCommand(
    s,
    {
      kind: "feedback",
      payload: {
        ...fb(),
        polarity: "positive",
        severity: "low",
        text: "We love the results",
      },
    },
    ctx,
  );
  const d = evaluate(s);
  assert.deepEqual(d.economics, before.economics);
  assert.equal(d.chosen.increment_micros, 0);
});
test("accept records exact handoff once, updates latest status, blocks another opportunity", () => {
  const s = ready(),
    d = record(s),
    before = s.snapshot.wallet_available_micros;
  applyCommand(
    s,
    {
      kind: "respond",
      payload: {
        decision_id: d.id,
        response: "accept",
        reason: "The customer capacity is available.",
      },
    },
    ctx,
  );
  assert.equal(s.latest.status, "Accepted for review");
  assert.equal(s.review_handoffs.length, 1);
  assert.equal(s.snapshot.wallet_available_micros, before);
  assert.equal(evaluate(s).chosen.increment_micros, 0);
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          kind: "respond",
          payload: {
            decision_id: d.id,
            response: "accept",
            reason: "Another attempt",
          },
        },
        ctx,
      ),
    /already/,
  );
  applyCommand(
    s,
    {
      kind: "withdraw_handoff",
      payload: {
        id: s.review_handoffs[0].id,
        note: "Capacity no longer available.",
      },
    },
    ctx,
  );
  assert.equal(s.review_handoffs[0].state, "Withdrawn");
});
test("decline pauses proposals for seven days and explicit policy change clears cooldown", () => {
  const s = ready(),
    d = record(s);
  applyCommand(
    s,
    {
      kind: "respond",
      payload: {
        decision_id: d.id,
        response: "decline",
        reason: "Wait until the next cycle.",
      },
    },
    ctx,
  );
  assert.equal(s.cooldown_until, "2026-10-26T00:00:00.000Z");
  assert.equal(evaluate(s).chosen.increment_micros, 0);
  applyCommand(
    s,
    {
      kind: "policy",
      payload: { expected_version: 1, policy: policyDefaults },
    },
    ctx,
  );
  assert.equal(s.cooldown_until, null);
  assert.equal(evaluate(s).chosen.increment_micros, 2e9);
});
test("stale decision and stale policy writes are rejected", () => {
  const s = ready(),
    d = record(s);
  s.policy_version++;
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          kind: "respond",
          payload: {
            decision_id: d.id,
            response: "accept",
            reason: "Attempt stale approval",
          },
        },
        ctx,
      ),
    /New evidence/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          kind: "policy",
          payload: { expected_version: 1, policy: policyDefaults },
        },
        ctx,
      ),
    /changed/,
  );
});
test("limits are monotonic: reducing any capacity never raises proposed spend", () => {
  const s = ready(),
    before = evaluate(s).chosen.increment_micros;
  for (const field of [
    "cash_capacity_micros",
    "inventory_capacity_micros",
    "max_step_bps",
    "reinvest_bps",
  ]) {
    const n = structuredClone(s);
    n.policy[field] = 0;
    assert.equal(evaluate(n).chosen.increment_micros, 0, field);
  }
  assert.ok(before > 0);
});
test("personal posterior adapts and cohort influence decays as own evidence accumulates", () => {
  const s = ready(),
    aggregate = {
      available: true,
      eligible: 500,
      qualified: 450,
      participants: 5,
    };
  let m = learnCustomer(s, aggregate, at);
  assert.equal(m.personal_weight, 0);
  s.learning.observations = [
    {
      external_id: "personal",
      at,
      eligible: 400,
      qualified: 80,
      mature: true,
      cohort: COHORT,
    },
  ];
  m = learnCustomer(s, aggregate, at);
  assert.ok(m.personal_weight > 0.95);
  assert.ok(m.qualification.mean < 0.25);
  assert.equal(m.expansion_veto, true);
  s.learning.model = m;
  assert.equal(evaluate(s).chosen.increment_micros, 0);
});
test("immature outcomes do not train; recent quality deterioration creates veto", () => {
  const s = ready();
  s.learning.observations = [
    { at: "2026-09-20T00:00:00Z", eligible: 100, qualified: 80, mature: true },
    { at, eligible: 100, qualified: 20, mature: true },
    { at, eligible: 10000, qualified: 10000, mature: false },
  ];
  const m = learnCustomer(s, undefined, at);
  assert.equal(m.mature_rows, 2);
  assert.equal(m.pending_rows, 1);
  assert.equal(m.drift.detected, true);
  assert.equal(m.expansion_veto, true);
});
test("aggregate suppresses small cohorts, excludes self and returns no raw identities", () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({
    organization_id: `fixture_${i}`,
    cohort: COHORT,
    source_mode: "fixture",
    eligible: 100,
    qualified: 70,
    updated_at: at,
  }));
  assert.equal(
    aggregateCohort(rows.slice(0, 5), { excludeOrganization: "fixture_0", at })
      .available,
    false,
  );
  const a = aggregateCohort(rows, { excludeOrganization: "fixture_0", at });
  assert.equal(a.participants, 5);
  assert.equal(a.available, true);
  assert.ok(!JSON.stringify(a).includes("fixture_1"));
});
test("contribution requires consent and cannot let a large customer dominate", () => {
  const s = ready();
  s.learning.observations = sampleLearning(at);
  assert.equal(contributionFor(s, at), null);
  s.learning.opt_in = true;
  assert.equal(contributionFor(s, at).eligible, 100);
});
test("benchmark reports missed target and refuses production promotion even on synthetic 3x", () => {
  const a = benchmarkPolicies(sampleBenchmark());
  assert.equal(a.observed_factor, 1.25);
  assert.equal(a.target_met, false);
  const data = sampleBenchmark();
  for (const p of data.pairs)
    p.challenger_contribution = p.baseline_contribution * 3;
  const b = benchmarkPolicies(data);
  assert.equal(b.target_met, true);
  assert.match(b.release_status, /Shadow only/);
  data.pairs[0].guardrail_violation = true;
  assert.equal(benchmarkPolicies(data).target_met, false);
});
test("nonpositive baseline cannot produce a misleading improvement multiple", () => {
  const x = sampleBenchmark();
  for (const p of x.pairs) p.baseline_contribution = 0;
  const b = benchmarkPolicies(x);
  assert.equal(b.observed_factor, null);
  assert.equal(b.target_met, false);
});

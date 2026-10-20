import test from "node:test";
import assert from "node:assert/strict";
import { OSRepository } from "../src/os/repository.mjs";
import { sqliteD1 } from "./helpers/sqlite-d1.mjs";
import { initialOS, applyCommand, ORG } from "../src/os/kernel.mjs";
import { productProposal } from "../web/js/product-proposals.mjs";
import {
  createInitialState,
  saveScenario,
  simulateDraft,
} from "../web/js/model.mjs";
const at = "2026-10-19T00:00:00.000Z";
const context = {
  organization_id: ORG,
  actor_id: "test-owner",
  at,
  operation_id: "proposal-test",
};
const creative = () => productProposal(createInitialState(), "creative", "a1");

test("cross-product snapshots are durable, tenant isolated, deduplicated and grant no spending authority", async (t) => {
  const db = sqliteD1();
  t.after(() => db.close());
  const repo = new OSRepository(db, {
    clock: () => at,
    evaluate: () => {
      throw new Error("Research must not recertify ROI");
    },
  });
  const local = createInitialState();
  const draft = {
    budget: 3000,
    days: 14,
    channel: "Search",
    goal: "conversions",
    assetId: "a1",
  };
  const scenario = saveScenario(local, draft, simulateDraft(draft));
  const run = (key, payload) =>
    repo.execute({
      actor_id: "owner",
      organization_id: ORG,
      key,
      command: { kind: "submit_proposal", payload },
    });
  for (const [product, id] of [
    ["creative", "a1"],
    ["experiments", "e1"],
    ["simulator", scenario.id],
  ])
    await run(`proposal-${product}`, productProposal(local, product, id));
  await run("proposal-second-key", creative());
  const loaded = await new OSRepository(db, { clock: () => at }).load(ORG);
  assert.equal(loaded.state.proposals.length, 3);
  assert.equal(loaded.state.review_handoffs.length, 0);
  assert.equal(loaded.state.decisions.length, 0);
  assert.ok(loaded.state.proposals.every((x) => x.spend_authority === false));
  assert.equal((await repo.load("fixture_other")).state.proposals.length, 0);
  assert.equal(
    (await repo.audit()).filter((x) => x.event_type === "proposal.submitted")
      .length,
    3,
  );
});

test("changed evidence creates an immutable revision and rejects stale or repeated review", () => {
  const state = initialOS(at),
    payload = creative();
  applyCommand(state, { kind: "submit_proposal", payload }, context);
  const original = structuredClone(state.proposals[0]);
  applyCommand(
    state,
    {
      kind: "submit_proposal",
      payload: {
        ...payload,
        data: {
          ...payload.data,
          observation: "Revised source observation, still a fixture.",
        },
      },
    },
    context,
  );
  const latest = state.proposals[0];
  assert.equal(latest.revision, 2);
  assert.equal(latest.supersedes, original.id);
  assert.deepEqual(state.proposals[1], original);
  const review = (p) => ({
    kind: "review_proposal",
    payload: {
      id: p.id,
      content_hash: p.content_hash,
      response: "accept_research",
      reason: "Worth a registered test.",
    },
  });
  assert.throws(
    () => applyCommand(state, review(original), context),
    /newest revision/,
  );
  applyCommand(state, review(latest), context);
  assert.equal(latest.status, "Accepted for research");
  assert.equal(latest.spend_authority, false);
  assert.throws(
    () => applyCommand(state, review(latest), context),
    /already has a review/,
  );
});

test("untrusted product evidence cannot certify forecasts or attach execution authority", () => {
  const state = initialOS(at),
    payload = creative();
  assert.throws(() =>
    applyCommand(
      state,
      {
        kind: "submit_proposal",
        payload: { ...payload, spend_authority: true },
      },
      context,
    ),
  );
  assert.throws(() =>
    applyCommand(
      state,
      {
        kind: "submit_proposal",
        payload: { ...payload, evidence_mode: "production" },
      },
      context,
    ),
  );
  assert.equal(state.proposals.length, 0);
  const local = createInitialState(),
    draft = {
      budget: 3000,
      days: 14,
      channel: "Search",
      goal: "conversions",
      assetId: "a1",
    };
  const saved = saveScenario(local, draft, simulateDraft(draft));
  local.assets[0].version++;
  assert.throws(() => productProposal(local, "simulator", saved.id), /changed/);
});

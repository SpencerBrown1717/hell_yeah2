import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import { mountWorkspace } from "../web/js/app.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { handleOS } from "../src/os/http.mjs";
import { evaluateGrowth } from "../src/os/kernel.mjs";
import { learnCustomer } from "../src/os/learning.mjs";
import { sqliteD1 } from "./helpers/sqlite-d1.mjs";
import { createOSClient } from "../web/js/os-client.mjs";
import { optimizationFixtureConfig, mockTrial, mockTrialReport } from "../src/os/adapters/mock-optimization.mjs";
import { runGrowthLearning } from "../src/os/workflow.mjs";
const html = await readFile(
  new URL("../web/index.html", import.meta.url),
  "utf8",
);
const settle = () => new Promise((r) => setImmediate(r));
for (const outcome of ["healthy", "poor", "limited"]) test(`guided ${outcome} demo completes every screen with a persisted Mastra decision`, async t => {
  const h = await harness(t, "demo"); h.repo.evaluate = runGrowthLearning;
  const go = async route => { h.w.location.hash = route; h.w.dispatchEvent(new h.w.HashChangeEvent("hashchange")); await h.idle(); };
  const until = async condition => { for (let i = 0; i < 500; i++) { if (condition()) return; await settle(); } assert.fail("Expected demo state did not appear"); };
  await h.submit("#demo-plan-form");
  assert.equal(h.app.getState().scenarios[0].draft.assetId, "a1");
  h.click('[data-action="demo-review"]');
  h.d.querySelector('#approval-form [name="confirmed"]').checked = true;
  await h.submit("#approval-form");
  assert.equal(h.app.getState().wallet.available, 9000);
  h.click('#dialog [data-action="demo-approve"]');
  assert.equal(h.app.getState().campaigns[0].status, "Serving");
  h.click('[data-action="demo-design"]');
  h.click('#dialog [data-action="transition-experiment"]'); await h.idle();
  h.click('#dialog [data-action="demo-results"]');
  h.fill("outcome", outcome); await h.submit("#demo-results-form");
  const local = h.app.getState(), campaign = local.campaigns[0], experiment = local.experiments[0];
  assert.equal(campaign.status, "Completed"); assert.equal(experiment.status, "Concluded");
  assert.equal(campaign.purchases, experiment.controlConversions + experiment.treatmentConversions);
  h.click('#dialog [data-action="close-dialog"]');
  h.click('[data-action="demo-learn"]');
  await until(() => h.app.getUI().os.data?.state.demo_runs?.length === 1 && !h.app.getUI().os.busy);
  const result = h.app.getUI().os.data.state.demo_runs[0];
  assert.equal(result.evidence.spend_micros, campaign.spend * 1e6);
  assert.equal(result.input.experiment.id, experiment.id);
  assert.equal(result.after.orchestrator, "Mastra");
  assert.equal(result.after.increment_micros, outcome === "healthy" ? 300e6 : 0);
  assert.match(h.d.querySelector('[data-testid="demo-decision"]').textContent, /SAVED OS DECISION/);
  assert.match(h.d.querySelector("main").textContent, /5 \/ 5 complete/);
  h.w.dispatchEvent(new h.w.Event("online")); await h.idle();
  assert.equal(h.app.getUI().os.data.state.demo_runs.length, 1);
  await go("growth"); assert.match(h.d.querySelector("main").textContent, /LATEST CAMPAIGN DEMO/);
  await go("wallet"); const balance = h.app.getState().wallet.available;
  h.click('[data-action="fund-wallet"]'); h.fill("amount", "500"); await h.submit("#fund-form");
  assert.equal(h.app.getState().wallet.available, balance + 500);
  await go("demo"); assert.match(h.d.querySelector("main").textContent, /5 \/ 5 complete/);
  h.click('[data-action="demo-new"]'); await h.submit("#demo-plan-form");
  assert.notEqual(h.app.getState().demoJourney.id, result.input.run_id);
  assert.equal(h.app.getUI().os.data.state.demo_runs.length, 1, "a new local plan does not erase the saved run");
});
test("one-step campaign guide and direct experiment learning share one persisted receipt", async t => {
  const h = await harness(t,"demo"); h.repo.evaluate=runGrowthLearning;
  await h.submit("#demo-plan-form");
  h.click('[data-action="demo-review"]');
  h.d.querySelector('#approval-form [name="confirmed"]').checked=true;
  await h.submit("#approval-form");
  h.click('#dialog [data-action="demo-approve"]');
  h.click('[data-action="demo-design"]');
  h.click('#dialog [data-action="transition-experiment"]'); await h.idle();
  h.click('#dialog [data-action="close-dialog"]');
  h.click('[data-action="demo-outcome"][data-outcome="healthy"]');
  const experiment=h.app.getState().experiments[0], balance=h.app.getState().wallet;
  assert.equal(h.d.querySelector(".flow-stage").dataset.step,"4");
  for(let attempt=0;attempt<2;attempt++) {
    h.w.location.hash="experiments"; h.w.dispatchEvent(new h.w.HashChangeEvent("hashchange")); await h.idle();
    h.click(`[data-action="experiment-detail"][data-id="${experiment.id}"]`);
    h.click('#dialog [data-action="experiment-learn"]'); await h.idle();
    const result=h.app.getUI().os.data.state.demo_runs;
    assert.equal(result.length,1);
    assert.equal(result[0].input.experiment.id,experiment.id);
    assert.equal(result[0].after.increment_micros,300e6);
    assert.deepEqual(h.app.getState().wallet,balance);
  }
});
test("a personal trial recommendation becomes an exact reviewed packet through the dashboard", async t => {
  const h = await harness(t, "learning"), org = h.app.getUI().os.data.state.organization_id;
  const clock = h.repo.clock; h.repo.clock = () => "2026-10-01T00:00:00.000Z";
  const send = (kind, payload) => h.repo.execute({ organization_id: org, actor_id: "test:source", key: "ui-trial-" + kind, command: { kind, payload } });
  await send("optimization_configure", { expected_version: 0, config: optimizationFixtureConfig() });
  const design = mockTrial(org); await send("optimization_register", design);
  h.repo.clock = () => design.mature_after; await send("optimization_report", mockTrialReport(design));
  h.repo.clock = clock;
  h.w.dispatchEvent(new h.w.Event("online")); await h.idle();
  h.click('[data-action="os-optimization-review"][data-mode="fixture"]');
  assert.match(h.d.querySelector("#os-optimization-review-form").textContent, /\$1,000.00 \/ \$1,000.00/);
  h.d.querySelector('#os-optimization-review-form [name="confirmed"]').checked = true;
  await h.submit("#os-optimization-review-form");
  const proposal = h.app.getUI().os.data.state.optimization.fixture.proposals[0];
  assert.equal(proposal.status, "Ready for platform draft");
  assert.equal(proposal.plan.spend_authority, false); assert.equal(proposal.receipt, null);
});
test("continuous-learning controls, experience feedback and unpaid Wallet request persist through the UI", async t => {
  const h = await harness(t, "learning");
  assert.match(h.d.querySelector("#continuous-learning").textContent, /Awaiting the Hellyeah reporting connection/);
  h.click('[data-action="os-optimization-settings"][data-mode="live"]');
  h.fill("industry", "software"); h.fill("min_roi", "40");
  await h.submit("#os-optimization-settings-form");
  let state = h.app.getUI().os.data.state;
  assert.equal(state.optimization.live.config.min_roi_bps, 4000);
  assert.equal(state.optimization.live.config.share_learning, false);
  assert.equal(state.optimization.live.trials.length, 0);
  h.click('[data-action="os-experience-rating"][data-polarity="negative"]'); await h.idle();
  assert.equal(h.app.getUI().os.data.state.feedback.at(-1).category, "experience");
  h.w.location.hash = "wallet-lab"; h.w.dispatchEvent(new h.w.HashChangeEvent("hashchange")); await h.idle();
  const balance = h.app.getState().wallet.available;
  h.click('[data-action="os-wallet-prompts"]'); await h.idle();
  assert.equal(h.app.getUI().os.data.funding_advice.eligible, false);
  h.click('[data-action="os-wallet-intent"]'); h.fill("amount", "750");
  h.d.querySelector('#os-wallet-intent-form [name="confirmed"]').checked = true;
  await h.submit("#os-wallet-intent-form");
  state = h.app.getUI().os.data.state;
  assert.equal(state.wallet_growth.intents[0].amount_cents, 75000);
  assert.equal(state.wallet_growth.intents[0].stripe_checkout_url, null);
  assert.equal(h.app.getState().wallet.available, balance);
  assert.match(h.d.querySelector("#customer-growth").textContent, /payment connection pending/);
  assert.match(h.d.querySelector("#customer-growth").textContent, /\$750.00/);
});
test("all three product screens save evidence to the persistent OS and record a research review", async (t) => {
  const h = await harness(t, "simulator");
  const go = async (route) => {
    h.w.location.hash = route;
    h.w.dispatchEvent(new h.w.HashChangeEvent("hashchange"));
    await h.idle();
  };
  const balance = h.app.getState().wallet.available;
  h.click('[data-action="save-scenario"]');
  h.click('[data-action="os-share-proposal"][data-product="simulator"]');
  await h.idle();
  await go("creative");
  h.click('[data-action="asset"][data-id="a1"]');
  h.click('[data-action="os-share-proposal"][data-product="creative"]');
  await h.idle();
  await go("experiments");
  h.click('[data-action="experiment-detail"][data-id="e1"]');
  h.click('[data-action="os-share-proposal"][data-product="experiments"]');
  await h.idle();
  await go("growth");
  assert.equal(h.app.getUI().os.data.state.proposals.length, 3);
  assert.match(
    h.d.querySelector("main").textContent,
    /Evidence from every product/,
  );
  h.click('[data-action="os-proposal"]');
  h.fill("reason", "Use the evidence to design a registered research test.");
  await h.submit("#os-proposal-form");
  const org = h.app.getUI().os.data.state.organization_id;
  const stored = await h.repo.load(org);
  assert.equal(stored.state.proposals[0].status, "Accepted for research");
  assert.equal(stored.state.proposals[0].spend_authority, false);
  assert.equal(stored.state.review_handoffs.length, 0);
  assert.equal(h.app.getState().wallet.available, balance);
});
async function harness(t, route = "growth") {
  const errors = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  const dom = new JSDOM(html, {
      url: `https://os.test/#${route}`,
      pretendToBeVisual: true,
      virtualConsole: vc,
    }),
    w = dom.window,
    d = w.document,
    db = sqliteD1();
  let identity = "ui-test-user";
  const repo = new OSRepository(db, {
    evaluate: async (s, c) => ({
      ...evaluateGrowth(
        {
          ...s,
          learning: {
            ...s.learning,
            model: learnCustomer(s, c.aggregate, c.at),
          },
        },
        { at: c.at, runId: c.operation_id },
      ),
      learning: learnCustomer(s, c.aggregate, c.at),
    }),
  });
  w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.fetch = async (path, options = {}) =>
    handleOS(
      new Request(new URL(path, w.location.href), {
        ...options,
        headers: {
          ...options.headers,
          origin: "https://os.test",
          ...(identity
            ? { "oai-authenticated-user-id": identity }
            : { "oai-authenticated-user-email": "fixture@example.test" }),
        },
      }),
      { repository: repo },
    );
  const app = mountWorkspace(w);
  async function idle() {
    for (let i = 0; i < 300; i++) {
      await settle();
      if (
        !app.getUI().os.loading &&
        !app.getUI().os.busy &&
        (app.getUI().os.data || app.getUI().os.authRequired)
      )
        return;
    }
    throw new Error("OS did not settle.");
  }
  await idle();
  const click = (selector) => {
    const el = d.querySelector(selector);
    assert.ok(el, selector);
    el.click();
  };
  const fill = (name, value) => {
    const e = d.querySelector(`[name="${name}"]`);
    assert.ok(e, name);
    e.value = value;
  };
  const submit = async (selector) => {
    d.querySelector(selector).dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await idle();
  };
  const change = async (selector, value) => {
    const el = d.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new w.Event("change", { bubbles: true }));
    await idle();
  };
  t.after(() => {
    app.destroy();
    dom.window.close();
    db.close();
    assert.deepEqual(errors, []);
  });
  return {
    d,
    w,
    app,
    click,
    fill,
    submit,
    change,
    idle,
    repo,
    setIdentity: (id) => {
      identity = id;
    },
  };
}
test("account switch discards the previous account view and incomplete identity shows a sign-in recovery link", async (t) => {
  const h = await harness(t);
  h.click('[data-action="os-feedback"]');
  h.fill("text", "Keep this customer concern private to the original account.");
  await h.submit("#os-feedback-form");
  const alice = h.app.getUI().os.data;
  h.setIdentity("second-user");
  h.w.dispatchEvent(new h.w.Event("online"));
  await h.idle();
  const bob = h.app.getUI().os.data;
  assert.notEqual(bob.state.organization_id, alice.state.organization_id);
  assert.equal(bob.state.feedback.length, 0);
  assert.ok(bob.revision < alice.revision);
  assert.equal(
    (await h.repo.load(alice.state.organization_id)).state.feedback.length,
    1,
  );
  h.setIdentity(null);
  h.w.dispatchEvent(new h.w.Event("online"));
  await h.idle();
  assert.equal(h.app.getUI().os.data, null);
  const link = h.d.querySelector(
    'a[href="/signin-with-chatgpt?return_to=%2F"]',
  );
  assert.ok(link);
  assert.equal(link.target, "_top");
});
test("feedback queues stay bound to their originating workspace across account switches", async () => {
  const legacy = JSON.stringify([
    {
      key: "legacy-key",
      payload: { external_id: "unscoped", text: "Unknown owner" },
    },
  ]);
  const memory = new Map([["hell_yeah2.os-feedback-outbox.v1", legacy]]),
    calls = [];
  const client = createOSClient({
    storage: {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => memory.set(k, v),
    },
    fetcher: async (_, o) => {
      calls.push({
        workspace: o.headers["X-HY-Expected-Workspace"],
        event: JSON.parse(o.body).payload.external_id,
      });
      return Response.json({ ok: true });
    },
  });
  assert.equal(client.enqueue({ external_id: "anonymous" }), false);
  client.setWorkspace("fixture_alice");
  client.enqueue({ external_id: "alice-event" });
  client.setWorkspace("fixture_bob");
  assert.equal(client.pending().length, 0);
  client.enqueue({ external_id: "bob-event" });
  await client.flush();
  assert.deepEqual(calls, [{ workspace: "fixture_bob", event: "bob-event" }]);
  client.setWorkspace("fixture_alice");
  assert.equal(client.pending().length, 1);
  await client.flush();
  assert.deepEqual(calls[1], {
    workspace: "fixture_alice",
    event: "alice-event",
  });
  assert.equal(memory.get("hell_yeah2.os-feedback-outbox.v1"), legacy);
});
test("persistent UI: choose economic sample, submit concern, resolve and accept exact draft", async (t) => {
  const h = await harness(t);
  await h.change('[data-change="os-sample"]', "scale_ready");
  assert.equal(h.app.getUI().os.data.state.latest.chosen.increment_micros, 2e9);
  h.click('[data-action="os-feedback"]');
  h.fill("text", "<script>bad()</script> These leads are outside our market.");
  await h.submit("#os-feedback-form");
  assert.equal(h.app.getUI().os.data.state.latest.type, "resolve_feedback");
  assert.equal(h.d.querySelectorAll("main script").length, 0);
  h.click('[data-action="os-resolve"]');
  h.fill("note", "Customer confirmed that targeting was corrected.");
  await h.submit("#os-note-form");
  h.click('[data-action="os-respond"][data-response="accept"]');
  h.fill("reason", "We have capacity for a bounded experiment.");
  h.d.querySelector('[name="confirmed"]').checked = true;
  await h.submit("#os-response-form");
  assert.equal(h.app.getUI().os.data.state.review_handoffs.length, 1);
  assert.match(h.d.querySelector("main").textContent, /Accepted for review/);
  assert.equal(h.app.getState().wallet.available, 12000);
});
test("growth policy form changes real recommendation envelope", async (t) => {
  const h = await harness(t);
  await h.change('[data-change="os-sample"]', "scale_ready");
  h.click('[data-action="os-policy"]');
  h.fill("max_step_bps", "0");
  await h.submit("#os-policy-form");
  assert.equal(h.app.getUI().os.data.state.policy.max_step_bps, 0);
  assert.equal(h.app.getUI().os.data.state.latest.chosen.increment_micros, 0);
});
test("learning lab loads personal evidence, records aggregate consent and benchmark failure", async (t) => {
  const h = await harness(t, "learning");
  h.click('[data-action="os-learning-sample"]');
  await h.idle();
  assert.ok(h.app.getUI().os.data.state.learning.model.personal_weight > 0.9);
  h.click('[data-action="os-consent"]');
  await h.idle();
  assert.equal(h.app.getUI().os.data.state.learning.opt_in, true);
  h.click('[data-action="os-benchmark"]');
  await h.idle();
  assert.match(h.d.querySelector("main").textContent, /Target not met/);
  assert.equal(
    h.app.getUI().os.data.state.learning.benchmark.observed_factor,
    1.25,
  );
});
test("feedback outbox retries failed delivery with same operation key and removes only acknowledged event", async () => {
  const memory = new Map(),
    storage = {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => memory.set(k, v),
    };
  let fail = true,
    keys = [];
  const c = createOSClient({
    storage,
    fetcher: async (_, o) => {
      keys.push(o.headers["Idempotency-Key"]);
      if (fail) throw new Error("Offline");
      return Response.json({ ok: true });
    },
  });
  c.setWorkspace("fixture_outbox");
  c.enqueue({ external_id: "outbox-1", text: "Customer action" });
  await assert.rejects(() => c.flush(), /Offline/);
  assert.equal(c.pending().length, 1);
  fail = false;
  await c.flush();
  assert.equal(c.pending().length, 0);
  assert.equal(keys[0], keys[1]);
});
test("feedback outbox cannot spin forever when acknowledgement storage fails", async () => {
  let text = null,
    broken = false;
  const storage = {
    getItem: () => text,
    setItem: (_, v) => {
      if (broken) throw new Error("Disk full");
      text = v;
    },
  };
  const c = createOSClient({
    storage,
    fetcher: async () => Response.json({ ok: true }),
  });
  c.setWorkspace("fixture_outbox");
  c.enqueue({ external_id: "event", text: "Customer action" });
  broken = true;
  await assert.rejects(() => c.flush(), /queue could not be updated/);
  assert.equal(c.pending().length, 1);
});

test("mock campaign button runs all four product handoffs through the server and renders evidence", async (t) => {
  const h = await harness(t, "learning");
  h.click('[data-action="os-mock-campaign"]');
  await h.idle();
  const trial = h.app.getUI().os.data.state.last_mock_trial;
  assert.ok(trial, "Server trial is persisted");
  assert.equal(trial.passed, true);
  assert.equal(Object.keys(trial.products).length, 4);
  assert.match(
    h.d.querySelector("main").textContent,
    /End-to-end checks passed/,
  );
  assert.match(h.d.querySelector("main").textContent, /\$2,000/);
  assert.equal(h.app.getUI().os.data.state.source_reports, undefined);
});

test("background controls persist work, process it, and isolate the job list after account switch", async (t) => {
  const h = await harness(t, "learning");
  h.click('[data-action="os-queue-evaluate"]'); await h.idle();
  assert.equal(h.app.getUI().os.jobs.counts.queued, 1);
  assert.match(h.d.querySelector("#background-jobs").textContent, /Waiting/);
  h.click('[data-action="os-drain-jobs"]'); await h.idle();
  assert.equal(h.app.getUI().os.jobs.counts.succeeded, 1);
  h.click('[data-action="os-background"]'); await h.idle();
  assert.equal(h.app.getUI().os.jobs.background.enabled, true);
  assert.equal(h.d.querySelector('[data-action="os-background"]').getAttribute("aria-checked"), "true");
  h.setIdentity("second-job-owner");
  h.click('[data-action="os-reload"]'); await h.idle();
  assert.equal(h.app.getUI().os.jobs.jobs.length, 0);
  assert.equal(h.app.getUI().os.jobs.background.enabled, false);
});

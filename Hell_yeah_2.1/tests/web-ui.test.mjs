import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import { mountWorkspace } from "../web/js/app.mjs";
import { routes } from "../web/js/views.mjs";
import { createInitialState } from "../web/js/model.mjs";
const html = await readFile(
  new URL("../web/index.html", import.meta.url),
  "utf8",
);
function harness(t, route = "overview", stored) {
  const errors = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  const dom = new JSDOM(html, {
    url: `https://fixture.test/#${route}`,
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;
  w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  if (stored)
    w.localStorage.setItem("hell_yeah2.workspace.v1", JSON.stringify(stored));
  const app = mountWorkspace(w),
    d = w.document;
  t.after(() => {
    app.destroy();
    w.close();
    assert.deepEqual(errors, [], "No unhandled DOM runtime errors");
  });
  const click = (selector) => {
    const e = d.querySelector(selector);
    assert.ok(e, `Missing ${selector}`);
    e.click();
    return e;
  };
  const input = (selector, value) => {
    const e = d.querySelector(selector);
    assert.ok(e, `Missing ${selector}`);
    e.value = value;
    e.dispatchEvent(new w.Event("input", { bubbles: true }));
    return e;
  };
  const change = (selector, value) => {
    const e = d.querySelector(selector);
    assert.ok(e, `Missing ${selector}`);
    e.value = value;
    e.dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  const submit = (selector) => {
    const f = d.querySelector(selector);
    assert.ok(f, `Missing ${selector}`);
    f.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  };
  return { w, d, app, click, input, change, submit };
}
for (const route of Object.keys(routes))
  test(`route ${route} renders with one main heading and working shell`, (t) => {
    const { d } = harness(t, route);
    assert.equal(d.querySelectorAll("main h1").length, 1);
    if (route !== "wallet-lab") assert.ok(d.querySelector('[aria-current="page"]'));
    assert.match(d.body.textContent, /Demo mode|PREVIEW DATA/);
    assert.ok(d.querySelector("footer"));
    const ids = [...d.querySelectorAll("[id]")].map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  });
test("homepage opens the existing dashboard and leaves new products outside primary navigation", (t) => {
  const { d } = harness(t, "home");
  assert.match(d.querySelector("main h1").textContent, /Good evening, Spencer/);
  const nav = d.querySelector('nav[aria-label="Main navigation"]');
  assert.deepEqual([...nav.querySelectorAll("a")].map(a => a.hash), ["#overview", "#campaigns", "#brand", "#studio", "#wallet", "#tracking"]);
  for (const key of ["growth", "simulator", "creative", "experiments"]) {
    assert.equal(d.querySelector(`a[href="#${key}"]`), null, `${key} is not advertised as part of the existing platform`);
  }
  assert.ok(d.querySelector('[data-action="f-new-campaign"]'));
  assert.ok(d.querySelector('a[href="#onboarding"]'));
  assert.match(d.querySelector("footer").textContent, /No live ads or payments/);
});
test("campaign guide exposes only the current stage and offers a direct prerequisite repair", t => {
  const state=createInitialState(); state.tracker.enabled=false;
  const { d }=harness(t,"demo",state);
  assert.equal(d.querySelectorAll(".flow-stage").length,1);
  assert.equal(d.querySelector('#demo-plan-form [type="submit"]').disabled,true);
  assert.ok(d.querySelector('.flow-readiness .blocked[href="#brand"]'));
  assert.equal(d.querySelector('[data-action="demo-step"][data-step="4"]').disabled,true);
});
test("campaign progress permits revisiting a finished stage without duplicating the plan", t => {
  const { d, app, submit, click }=harness(t,"demo");
  submit("#demo-plan-form");
  assert.equal(d.querySelector(".flow-stage").dataset.step,"1");
  click('[data-action="demo-step"][data-step="0"]');
  assert.equal(d.querySelector(".flow-stage").dataset.step,"0");
  assert.equal(d.querySelector("#demo-plan-form"),null);
  click('.flow-stage [data-action="demo-step"][data-step="1"]');
  assert.equal(app.getState().scenarios.length,1);
  assert.ok(d.querySelector('[data-action="demo-review"]'));
});
test("asynchronous OS repaint preserves the campaign draft and keyboard focus", async t => {
  const { d, w, app, input, change }=harness(t,"demo");
  input('#demo-plan-form [name="budget"]',"5000");
  change('#demo-plan-form [name="days"]',"30");
  const budget=d.querySelector('#demo-plan-form [name="budget"]'); budget.focus();
  await new Promise(resolve=>setImmediate(resolve));
  app.render();
  assert.equal(d.querySelector('#demo-plan-form [name="budget"]').value,"5000");
  assert.equal(d.querySelector('#demo-plan-form [name="days"]').value,"30");
  assert.equal(w.document.activeElement.name,"budget");
});
test("simulator → saved scenario → exact review → one Wallet reservation → campaign", (t) => {
  const { d, app, click, input, submit } = harness(t, "simulator");
  input("#sim-budget", "4000");
  assert.equal(d.querySelector('[data-action="save-scenario"]').disabled, true);
  submit("#sim-form");
  assert.equal(
    d.querySelector('[data-action="save-scenario"]').disabled,
    false,
  );
  click('[data-action="save-scenario"]');
  assert.equal(app.getState().scenarios.length, 1);
  click('[data-action="queue-scenario"]');
  const checkbox = d.querySelector('[name="confirmed"]');
  checkbox.checked = true;
  submit("#approval-form");
  assert.equal(app.getState().wallet.available, 8000);
  assert.equal(app.getState().campaigns[0].status, "In Review");
  assert.match(d.getElementById("dialog").textContent, /awaiting review/);
});
test("creative inspector seeds a real experiment draft and controls its lifecycle", (t) => {
  const { d, app, click, input, submit } = harness(t, "creative");
  click('[data-action="asset"][data-id="a1"]');
  assert.match(d.getElementById("dialog").textContent, /Observed only/);
  click('[data-action="new-experiment"]');
  input('[name="name"]', "Benefit-led headline");
  submit("#experiment-form");
  const id = app.getState().experiments[0].id;
  assert.equal(app.getState().experiments[0].status, "Draft");
  click('[data-action="transition-experiment"]');
  assert.equal(
    app.getState().experiments.find((e) => e.id === id).status,
    "Running",
  );
  click('[data-action="transition-experiment"]');
  assert.equal(
    app.getState().experiments.find((e) => e.id === id).status,
    "Paused",
  );
});
test("cancel in a completed form never submits it", (t) => {
  const { app, click, input } = harness(t, "experiments");
  click('[data-action="new-experiment"]');
  input('[name="name"]', "Should not be saved");
  click('#experiment-form [data-action="close-dialog"]');
  assert.equal(app.getState().experiments.length, 3);
});
test("filter and format controls show correct creative subsets", (t) => {
  const { d, click, change } = harness(t, "creative");
  click('[data-action="asset-filter"][data-value="Needs Attention"]');
  assert.equal(d.querySelectorAll(".creative-card").length, 1);
  assert.match(d.querySelector(".creative-card").textContent, /Made to keep/);
  change('[data-change="asset-format"]', "Search copy");
  assert.equal(d.querySelectorAll(".creative-card").length, 0);
  assert.match(d.body.textContent, /No creative matches/);
});
test("search updates result cards and preserves typed text", async (t) => {
  const { d, input } = harness(t, "creative");
  input("#asset-search", "daily");
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(d.querySelectorAll(".creative-card").length, 1);
  assert.equal(d.querySelector("#asset-search").value, "daily");
});
test("global search returns clickable experiment results", (t) => {
  const { d, click, input } = harness(t, "experiments");
  click('[data-action="search"]');
  input("#global-search", "clearer reason");
  assert.equal(d.querySelectorAll(".global-result").length, 1);
  click(".global-result");
  assert.match(d.querySelector("#dialog-title").textContent, /clearer reason/);
});
test("Tracking installation waits for an event and preserves that state on a new mount", (t) => {
  const { d, w, app, click } = harness(t, "tracking");
  click('[data-action="f-tracking-method"][data-method="Google Tag Manager"]');
  assert.equal(app.getState().tracker.installed, true);
  assert.equal(app.getState().tracker.method, "gtm");
  assert.equal(app.getState().tracker.receiving, false);
  assert.equal(app.getState().tracker.verified, false);
  assert.match(d.querySelector(".f-tracking-state").textContent, /Waiting for the first event/);
  const saved = JSON.parse(w.localStorage.getItem("hell_yeah2.workspace.v1"));
  const second = harness(t, "tracking", saved);
  assert.equal(second.app.getState().tracker.installed, true);
  assert.equal(second.app.getState().tracker.receiving, false);
  assert.match(second.d.querySelector(".f-tracking-state").textContent, /Waiting for the first event/);
});
test("Wallet funding changes only demo available balance", (t) => {
  const { app, click, input, submit } = harness(t, "wallet");
  click('[data-action="fund-wallet"]');
  input('[name="amount"]', "2500");
  submit("#fund-form");
  assert.equal(app.getState().wallet.available, 14500);
  assert.equal(app.getState().wallet.reserved, 8500);
});
test("pause campaign retains Wallet reservation", (t) => {
  const { d, app, click } = harness(t, "campaigns");
  click('[data-action="f-campaign"][data-id="c1"]');
  click('[data-action="toggle-campaign"]');
  assert.equal(app.getState().campaigns[0].status, "Paused");
  assert.equal(app.getState().wallet.reserved, 8500);
  assert.match(d.getElementById("dialog").textContent, /Paused/);
});
test("sample capture never fetches a website and is visibly labelled", (t) => {
  const { d, app, click, input, submit } = harness(t, "creative");
  click('[data-action="capture"]');
  input('[name="url"]', "https://example.com");
  input('[name="label"]', "My landing page");
  d.querySelector('[name="owned"]').checked = true;
  submit("#capture-form");
  assert.equal(app.getState().captures[0].source, "fixture");
  click('[data-action="capture-detail"]');
  assert.match(
    d.getElementById("dialog").textContent,
    /No live page retrieval/,
  );
  click('[data-action="capture-creative"]');
  const asset = app.getState().assets[0];
  assert.equal(asset.captureId, app.getState().captures[0].id);
  assert.equal(asset.theme, "navy");
  assert.ok(d.querySelector("#dialog .creative-art.navy"));
  click('#dialog [data-action="new-experiment"]');
  input('[name="name"]', "Research sample test");
  submit("#experiment-form");
  assert.equal(app.getState().experiments[0].assetId, asset.id);
  click('#dialog [data-action="transition-experiment"]');
  click('#dialog [data-action="demo-results"]');
  submit("#demo-results-form");
  assert.equal(app.getState().experiments[0].status, "Concluded");
  assert.equal(app.getState().wallet.available, 12000, "standalone sample results do not charge a campaign");
});
test("unfinished sample creative can be completed and then used in the simulator", t => {
  const { d, app, click } = harness(t, "creative");
  click('[data-action="asset"][data-id="a5"]');
  click('[data-action="demo-finish-asset"]');
  const asset = app.getState().assets.find(a => a.id === "a5");
  assert.equal(asset.status, "Ready"); assert.equal(asset.version, 2);
  assert.equal(asset.square, true); assert.equal(asset.textReady, true);
  assert.equal(d.querySelector('#dialog [data-action="demo-finish-asset"]'), null);
  click('#dialog [data-action="asset-simulate"]');
  assert.equal(app.getUI().simDraft.assetId, "a5");
});
test("user content is escaped in research labels", (t) => {
  const { d, click, input, submit } = harness(t, "creative");
  click('[data-action="capture"]');
  input('[name="url"]', "https://example.com");
  input('[name="label"]', "<img src=x onerror=alert(1)>");
  d.querySelector('[name="owned"]').checked = true;
  submit("#capture-form");
  assert.equal(d.querySelectorAll('img[src="x"]').length, 0);
  assert.match(d.body.textContent, /<img src=x/);
});
test("reporting range updates sample totals and labels the overview spend chart", (t) => {
  const { d, app, change } = harness(t);
  assert.equal(d.querySelector(".f-performance .f-metric strong").textContent, "$18,462");
  change('[data-change="range"]', "7");
  assert.equal(app.getState().range, 7);
  assert.equal(d.querySelector(".f-performance .f-metric strong").textContent, "$4,308");
  const chart = d.querySelector('svg.f-chart[role="img"]');
  assert.equal(chart.getAttribute("aria-label"), "Illustrative sample spend trend");
  assert.match(chart.textContent, /Day 7/);
  assert.equal(d.querySelector('[data-change="range"]').value, "7");
});
test("reset is explicit and restores local data", (t) => {
  const { app, click } = harness(t, "settings");
  click('[data-action="toggle-autonomy"]');
  assert.equal(app.getState().autonomyPaused, true);
  click('[data-action="reset"]');
  assert.equal(app.getState().autonomyPaused, true);
  click('[data-action="confirm-reset"]');
  assert.equal(app.getState().autonomyPaused, false);
});

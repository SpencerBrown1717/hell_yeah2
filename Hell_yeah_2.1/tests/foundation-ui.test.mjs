import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import { mountWorkspace } from "../web/js/app.mjs";

const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
const turn = () => new Promise(resolve => setTimeout(resolve, 20));

function harness(t, route = "overview") {
  const errors = [], vc = new VirtualConsole();
  vc.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(html, { url: `https://fixture.test/#${route}`, pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.scrollTo = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const app = mountWorkspace(w);
  t.after(() => { app.destroy(); w.close(); assert.deepEqual(errors, []); });
  const select = selector => { const el = d.querySelector(selector); assert.ok(el, `Missing ${selector}`); return el; };
  const click = selector => { const el = select(selector); el.click(); return el; };
  const fill = (selector, value) => { const el = select(selector); el.value = value; el.dispatchEvent(new w.Event("input", { bubbles: true })); return el; };
  const submit = selector => { const form = select(selector); form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); return form; };
  return { w, d, app, select, click, fill, submit };
}

test("baseline dashboard navigation presents the existing customer product", t => {
  const { d } = harness(t);
  const labels = [...d.querySelectorAll('nav[aria-label="Main navigation"] a')].map(a => a.textContent.trim());
  assert.deepEqual(labels, ["Overview", "Campaigns", "Brand", "Studio", "Wallet", "Tracking"]);
  assert.equal(d.querySelectorAll("main h1").length, 1);
  for (const route of ["growth", "simulator", "creative", "experiments"])
    assert.equal(d.querySelector(`a[href="#${route}"]`), null);
});

test("new campaign flows from goal through editable draft and exact budget review", async t => {
  const { d, app, select, click, fill, submit } = harness(t, "campaigns");
  const available = app.getState().wallet.available, reserved = app.getState().wallet.reserved;
  click('[data-action="f-new-campaign"]');
  await turn();
  fill('#f-campaign-goal-form [name="goalSentence"]', "Reach everyday essentials customers in the United States");
  submit("#f-campaign-goal-form");
  const id = app.getState().campaigns[0].id;
  assert.equal(app.getState().campaigns[0].status, "Draft");
  assert.equal(app.getState().scenarios.length, 0);
  assert.equal(app.getState().wallet.available, available);
  fill('#f-campaign-draft-form [name="dailyBudget"]', "12.50");
  fill('#f-campaign-draft-form [name="days"]', "10");
  click('[data-action="f-submit-campaign"]');
  assert.equal(app.getState().campaigns[0].maximum, 125);
  assert.match(d.getElementById("dialog").textContent, /\$125/);
  select('#f-confirm-campaign-form [name="confirmed"]').checked = true;
  submit("#f-confirm-campaign-form");
  assert.equal(app.getState().campaigns[0].status, "In Review");
  assert.equal(app.getState().wallet.available, available - 125);
  assert.equal(app.getState().wallet.reserved, reserved + 125);
  assert.ok(app.getState().campaigns[0].creativeSnapshot);
  click(`[data-action="f-review-demo"][data-id="${id}"]`);
  assert.equal(app.getState().campaigns[0].status, "Serving");
  assert.equal(app.getState().wallet.available, available - 125);
});

test("tracking installation waits for a labeled sample event before readiness", t => {
  const { app, select, click, fill, submit, d } = harness(t, "tracking");
  click('[data-action="f-tracking-method"][data-method="Manual Installation"]');
  assert.equal(app.getState().tracker.installed, true);
  assert.equal(app.getState().tracker.receiving, false);
  assert.equal(app.getState().tracker.verified, false);
  click('[data-action="f-track-event"]');
  fill('#f-event-form [name="name"]', "purchase");
  fill('#f-event-form [name="value"]', "75.50");
  select('#f-event-form [name="conversion"]').checked = true;
  submit("#f-event-form");
  const tracker = app.getState().tracker;
  assert.equal(tracker.receiving, true);
  assert.equal(tracker.verified, true);
  assert.equal(tracker.events[0].name, "purchase");
  assert.equal(tracker.events[0].value, 75.5);
  assert.equal(tracker.events[0].conversion, true);
  assert.match(d.querySelector("main").textContent, /purchase/);
});

test("new-business onboarding requires manual profile facts before a campaign", async t => {
  const { app, d, click, fill, submit } = harness(t, "onboarding");
  fill('#f-business-form [name="name"]', "Acme Dental");
  fill('#f-business-form [name="website"]', "acme.example");
  submit("#f-business-form");
  await turn();
  assert.equal(app.getState().brand.name, "Acme Dental");
  assert.equal(app.getState().brand.complete, false);
  assert.equal(app.getState().brand.audience, "");
  assert.equal(app.getState().tracker.verified, false);
  assert.equal(d.getElementById("dialog").open, false);
  click('[data-action="f-edit-brand"]');
  const fields = {
    industry: "Dental scheduling software",
    market: "United States",
    description: "Scheduling software for independent dental clinics.",
    audience: "Independent dental clinic owners",
    mainGoal: "Qualified demo requests",
    tone: "Clear and practical",
    valueProposition: "Fill cancellations with a one-click waitlist",
  };
  for (const [name, value] of Object.entries(fields)) fill(`#f-brand-form [name="${name}"]`, value);
  submit("#f-brand-form");
  assert.equal(app.getState().brand.complete, true);
  assert.equal(app.getState().brand.audience, fields.audience);
  click('[data-action="f-onboard-next"]');
  await turn();
  fill('#f-campaign-goal-form [name="goalSentence"]', "Get qualified demo requests from dental clinics in California");
  submit("#f-campaign-goal-form");
  assert.ok(d.querySelector("#f-studio-form"), "Old Forma creative cannot be reused for the new business");
  fill('#f-studio-form [name="name"]', "Acme Dental campaign creative");
  fill('#f-studio-form [name="headline"]', "Fill your dental schedule");
  submit("#f-studio-form");
  click('[data-action="f-use-studio"]');
  await turn();
  assert.equal(d.querySelector('#f-campaign-goal-form [name="goalSentence"]').value, "Get qualified demo requests from dental clinics in California");
  submit("#f-campaign-goal-form");
  assert.equal(app.getState().campaigns[0].destination, "https://acme.example/");
  assert.equal(app.getState().campaigns[0].status, "Draft");
  assert.equal(app.getState().assets.find(a => a.id === app.getState().campaigns[0].creativeId).brandName, "Acme Dental");
});

test("Studio selection carries the selected set into the baseline campaign draft", async t => {
  const { app, click, fill, submit } = harness(t, "studio");
  click('[data-action="f-studio-asset"][data-id="a2"]');
  click('[data-action="f-use-studio"]');
  await turn();
  fill('#f-campaign-goal-form [name="goalSentence"]', "Sell more of the new daily collection in California");
  submit("#f-campaign-goal-form");
  assert.equal(app.getState().campaigns[0].creativeId, "a2");
});

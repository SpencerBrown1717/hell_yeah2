import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../web/js/model.mjs";
import { normalizeFoundation, saveBrandProfile, beginBusinessProfile, creativeMatchesBrand, saveCampaignDraft, submitCampaignDraft, createStudioSet, updateTracking, recordTrackingEvent } from "../web/js/foundation-model.mjs";

const state = () => normalizeFoundation(createInitialState());
const plan = { name: "Spring essentials", goalSentence: "Get purchases from customers in the United States.", channel: "Search", goal: "conversions", destination: "https://forma.example/collection", dailyBudget: 25.50, days: 14, market: "United States", language: "English", creativeId: "a1" };

test("foundation normalization adds fields without overwriting existing work", () => {
  const s = createInitialState(); const before = structuredClone(s.campaigns); s.brand.audience = "Returning customers";
  normalizeFoundation(s); normalizeFoundation(s);
  assert.deepEqual(s.campaigns, before); assert.equal(s.brand.audience, "Returning customers"); assert.equal(s.wallet.available, 12000); assert.deepEqual(s.tracker.events, []);
});

test("a campaign draft saves and edits without a scenario or money movement", () => {
  const s = state(); const c = saveCampaignDraft(s, plan);
  assert.equal(c.status, "Draft"); assert.equal(c.maximum, 357); assert.equal(s.wallet.available, 12000); assert.equal(s.scenarios.length, 0); assert.equal(s.approvals.length, 0);
  saveCampaignDraft(s, { dailyBudget: 30 }, c.id); assert.equal(c.maximum, 420); assert.equal(s.campaigns.filter(x => x.id === c.id).length, 1);
});

test("launch requires confirmation, reserves once, and keeps complete snapshots", () => {
  const s = state(); const c = saveCampaignDraft(s, plan);
  assert.throws(() => submitCampaignDraft(s, c.id, false), /Confirm/);
  const result = submitCampaignDraft(s, c.id, true); submitCampaignDraft(s, c.id, true);
  assert.equal(result.status, "In Review"); assert.equal(s.wallet.available, 11643); assert.equal(s.wallet.reserved, 8857);
  s.brand.name = "Changed"; s.assets[0].headline = "Changed";
  assert.equal(result.brandSnapshot.name, "Forma"); assert.notEqual(result.creativeSnapshot.headline, "Changed"); assert.equal(result.snapshot.draft.destination, plan.destination);
  assert.throws(() => saveCampaignDraft(s, { dailyBudget: 10 }, c.id), /editable/);
});

test("conversion launch waits for a received event; impressions can proceed", () => {
  const s = state(); updateTracking(s, "Google Tag Manager"); const c = saveCampaignDraft(s, plan);
  assert.equal(s.tracker.receiving, false); assert.throws(() => submitCampaignDraft(s, c.id, true), /X-Ray/); assert.equal(s.wallet.available, 12000);
  recordTrackingEvent(s, { event: "purchase", conversion: true, value: 34.50 }); submitCampaignDraft(s, c.id, true);
  assert.equal(c.status, "In Review"); assert.equal(s.tracker.events[0].source, "demo"); assert.equal(s.tracker.conversionEvent, "purchase");
  const s2 = state(); updateTracking(s2, "manual"); const c2 = saveCampaignDraft(s2, { ...plan, goal: "impressions" }); submitCampaignDraft(s2, c2.id, true); assert.equal(c2.status, "In Review");
});

test("Wallet balance and workspace pause block launch without partial reservation", () => {
  const s = state(); const c = saveCampaignDraft(s, plan); s.wallet.available = 356;
  assert.throws(() => submitCampaignDraft(s, c.id, true), /Top up/); assert.equal(c.status, "Draft"); assert.equal(s.wallet.reserved, 8500);
  s.wallet.available = 12000; s.autonomyPaused = true; assert.throws(() => submitCampaignDraft(s, c.id, true), /paused/); assert.equal(s.wallet.available, 12000);
});

test("PMax requires both selected image formats and copy", () => {
  const s = state(); const c = saveCampaignDraft(s, { ...plan, channel: "PMax", creativeId: "a4" });
  assert.throws(() => submitCampaignDraft(s, c.id, true), /landscape/);
  s.assets.find(a => a.id === "a4").landscape = true; s.assets.find(a => a.id === "a4").square = true; s.assets.find(a => a.id === "a4").textReady = false;
  assert.throws(() => submitCampaignDraft(s, c.id, true), /Ad copy/);
});

test("updated brand or creative requires saving the draft again", () => {
  const s = state(); const c = saveCampaignDraft(s, plan); saveBrandProfile(s, { ...s.brand, audience: "Independent retailers" });
  assert.throws(() => submitCampaignDraft(s, c.id, true), /changed/); saveCampaignDraft(s, {}, c.id); submitCampaignDraft(s, c.id, true);
  assert.equal(c.brandSnapshot.audience, "Independent retailers");
});

test("Brand Profile saves all business fields and validates colors atomically", () => {
  const s = state(); saveBrandProfile(s, { ...s.brand, industry: "Retail", audience: "Shop owners", tone: "Practical", valueProposition: "Durable essentials", mainGoal: "Purchases", colors: [{ hex: "#aabbcc", role: "accent" }] });
  assert.equal(s.brand.industry, "Retail"); assert.equal(s.brand.audience, "Shop owners"); assert.deepEqual(s.brand.colors, [{ hex: "#AABBCC", role: "accent" }]);
  const before = structuredClone(s.brand); assert.throws(() => saveBrandProfile(s, { ...s.brand, name: "New", colors: [{ hex: "bad", role: "brand" }] }), /hex/); assert.deepEqual(s.brand, before);
});

test("new business review clears prior sample facts and blocks readiness until completed", () => {
  const s = state(); beginBusinessProfile(s, { name: "New business", website: "https://new.example" }); normalizeFoundation(s);
  assert.equal(s.brand.complete, false); assert.equal(s.brand.audience, ""); assert.equal(s.brand.tagline, ""); assert.equal(s.campaigns.length, 4);
  assert.equal(s.tracker.receiving, false); assert.equal(s.tracker.installed, false); assert.equal(s.foundation.trackerHistory.length, 1);
  assert.throws(() => saveBrandProfile(s, { name: "New business", website: "https://new.example" }), /industry/);
  saveBrandProfile(s, { industry: "Software", description: "Scheduling software", audience: "Gym owners", mainGoal: "Demo requests", tone: "Friendly", valueProposition: "Fill cancelled classes", market: "US", brandColor: "#123abc" });
  assert.equal(s.brand.complete, true); assert.deepEqual(s.brand.colors, [{ hex: "#123ABC", role: "brand" }]);
});

test("changing the business website invalidates prior tracking readiness but retains its history", () => {
  const s = state(); recordTrackingEvent(s, { name: "purchase", conversion: true, value: 25 });
  saveBrandProfile(s, { website: "https://another.example" });
  assert.equal(s.tracker.enabled, false); assert.deepEqual(s.tracker.events, []); assert.equal(s.foundation.trackerHistory[0].events[0].name, "purchase");
});

test("Studio creates a labeled local sample pinned to its Brand Profile", () => {
  const s = state(); const a = createStudioSet(s, { name: "Spring creative", headline: "Make room for better", subline: "Thoughtful everyday essentials" });
  assert.equal(a.demo, true); assert.equal(a.textReady, true); assert.equal(a.landscape && a.square, true); assert.match(a.source, /Demo sample/);
  s.brand.name = "Next brand"; assert.equal(a.brandSnapshot.name, "Forma");
});

test("new businesses cannot save or submit old Forma creative through a dropdown change", () => {
  const s = state();
  beginBusinessProfile(s, { name: "Scheduling Co", website: "https://scheduling.example" });
  saveBrandProfile(s, { industry: "Software", description: "Appointment scheduling", audience: "Gym owners", mainGoal: "Signups", tone: "Friendly", valueProposition: "Fill cancelled classes", market: "US" });
  assert.equal(creativeMatchesBrand(s, s.assets.find(a => a.id === "a1")), false);
  assert.throws(() => saveCampaignDraft(s, { ...plan, destination: s.brand.website }), /for this business/);
  const asset = createStudioSet(s, { name: "Scheduling creative" });
  assert.equal(creativeMatchesBrand(s, asset), true);
  const c = saveCampaignDraft(s, { ...plan, destination: s.brand.website, creativeId: asset.id, goal: "impressions" });
  assert.throws(() => saveCampaignDraft(s, { creativeId: "a1" }, c.id), /for this business/);
  c.creativeId = "a1"; c.creativeVersion = 1;
  assert.throws(() => submitCampaignDraft(s, c.id, true), /another business/);
  assert.equal(s.wallet.available, 12000); assert.equal(c.status, "Draft");
});

test("invalid inputs reject before records or balance change", () => {
  for (const patch of [{ dailyBudget: -1 }, { dailyBudget: 1.001 }, { dailyBudget: Infinity }, { days: 0 }, { days: 91 }, { destination: "javascript:alert(1)" }, { destination: "https://user:pass@example.com" }, { creativeId: "missing" }]) {
    const s = state(); assert.throws(() => saveCampaignDraft(s, { ...plan, ...patch })); assert.equal(s.campaigns.length, 4); assert.equal(s.wallet.available, 12000);
  }
});

test("Tracking requires an installation and never claims a real provider event", () => {
  const s = state(); s.tracker.installed = false;
  assert.throws(() => recordTrackingEvent(s, { name: "purchase", value: 10 }), /installation/);
  updateTracking(s, "shopify"); assert.throws(() => recordTrackingEvent(s, { name: "purchase", value: -10 }), /value/); assert.equal(s.tracker.receiving, false);
  const event = recordTrackingEvent(s, { name: "page_view", conversion: "false", value: 0 }); assert.equal(event.conversion, false); assert.equal(event.demo, true); assert.equal(s.tracker.verified, true);
});

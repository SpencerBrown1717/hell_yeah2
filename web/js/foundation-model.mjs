/** Existing Hellyeah workflow, represented by explicit browser-local demo records. */
import { assert, copy, log, readiness, uid } from "./model.mjs";

const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const httpsUrl = (value, label) => {
  let url;
  try { url = new URL(value); } catch { throw new Error(`Enter a complete ${label} URL.`); }
  assert(url.protocol === "https:" && !url.username && !url.password, `Use an https:// ${label} URL without embedded credentials.`);
  return url.href;
};
const dollars = (value, label) => {
  const n = Number(value), cents = Math.round(n * 100);
  assert(Number.isFinite(n) && n >= 0 && Number.isSafeInteger(cents) && Math.abs(n * 100 - cents) < 0.00001, `Enter a valid ${label} with at most two decimal places.`);
  return cents / 100;
};
const resetTrackingForBusiness = (s, website) => {
  s.foundation ??= { version: 1, onboardingComplete: false };
  if (s.tracker) {
    s.foundation.trackerHistory ??= [];
    s.foundation.trackerHistory.push(copy(s.tracker));
  }
  s.tracker = { enabled: false, installed: false, receiving: false, verified: false, method: "manual", events: [], website, source: "demo" };
};

/** Add fields without resetting an existing campaign account or its experimental work. */
export function normalizeFoundation(s) {
  s.brand ??= {};
  const defaults = {
    industry: "Consumer goods",
    description: s.brand.tagline || "Everyday essentials designed for daily use.",
    audience: "Customers looking for practical everyday essentials",
    mainGoal: "More purchases from the online store",
    tone: "Clear, warm, and confident",
    valueProposition: s.brand.tagline || "Practical essentials, thoughtfully made.",
    colors: [{ hex: "#FF4301", role: "brand" }, { hex: "#0D0C2B", role: "dark" }],
    logoUrl: "",
  };
  for (const [key, value] of Object.entries(defaults)) if (s.brand[key] === undefined) s.brand[key] = copy(value);
  s.tracker ??= { enabled: false, receiving: false, verified: false };
  s.tracker.method ??= "manual";
  s.tracker.installed ??= Boolean(s.tracker.enabled);
  s.tracker.events ??= [];
  s.foundation ??= { onboardingComplete: Boolean(s.brand.complete), version: 1 };
  return s;
}

export function saveBrandProfile(s, data) {
  const previous = s.brand ?? {}, next = { ...previous };
  next.name = text(data.name ?? previous.name, 60);
  assert(next.name.length >= 2, "Enter a business name.");
  next.website = httpsUrl(data.website ?? previous.website, "business website");
  const values = {
    industry: data.industry, description: data.description,
    audience: data.audience ?? data.targetAudience,
    mainGoal: data.mainGoal ?? data.goal,
    tone: data.tone, valueProposition: data.valueProposition,
    tagline: data.tagline, market: data.market,
  };
  for (const [key, value] of Object.entries(values)) if (value !== undefined) next[key] = text(value, key === "tagline" ? 160 : 1000);
  for (const key of ["industry", "description", "audience", "mainGoal", "tone", "valueProposition"])
    assert(text(next[key]).length > 0, `Complete the ${key === "mainGoal" ? "main goal" : key === "valueProposition" ? "value proposition" : key} field.`);
  if (own(data, "logoUrl")) next.logoUrl = data.logoUrl ? httpsUrl(data.logoUrl, "logo") : "";
  if (own(data, "brandColor")) {
    assert(/^#[a-fA-F0-9]{6}$/.test(data.brandColor), "Use a six-digit hex brand color.");
    next.colors = [{ hex: data.brandColor.toUpperCase(), role: "brand" }, ...(next.colors ?? []).filter(c => c.role !== "brand")];
  }
  if (own(data, "colors")) {
    assert(Array.isArray(data.colors) && data.colors.length <= 12, "Use up to 12 brand colors.");
    next.colors = data.colors.map(c => {
      assert(/^#[a-fA-F0-9]{6}$/.test(c.hex) && text(c.role).length, "Each color needs a six-digit hex value and a role.");
      return { hex: c.hex.toUpperCase(), role: text(c.role, 40) };
    });
  }
  next.version = (previous.version || 0) + 1;
  next.complete = true;
  if (previous.website && new URL(previous.website).hostname !== new URL(next.website).hostname)
    resetTrackingForBusiness(s, next.website);
  s.brand = next;
  s.foundation = { ...(s.foundation ?? {}), version: 1, onboardingComplete: true };
  log(s, "Brand Profile saved. Submitted campaign snapshots remain unchanged.", "brand");
  return next;
}

/** Begin manual business review without presenting the previous demo brand as researched facts. */
export function beginBusinessProfile(s, { name, website }) {
  const businessName = text(name, 60);
  assert(businessName.length >= 2, "Enter a business name.");
  const businessWebsite = httpsUrl(website, "business website");
  resetTrackingForBusiness(s, businessWebsite);
  s.brand = {
    name: businessName, website: businessWebsite, version: (s.brand?.version || 0) + 1,
    industry: "", description: "", audience: "", mainGoal: "", tone: "", valueProposition: "",
    tagline: "", market: "", colors: [], logoUrl: "", complete: false,
  };
  s.foundation = { ...(s.foundation ?? {}), version: 1, onboardingComplete: false };
  log(s, "Business identified. Review and complete its Brand Profile; no live website research has run.", "brand");
  return s.brand;
}

/** Bind new creative to its business; old bundled Forma assets stay in the original demo account. */
export function creativeMatchesBrand(s, asset) {
  if (!asset) return false;
  let currentHost;
  try { currentHost = new URL(s.brand.website).hostname.toLowerCase(); } catch { return false; }
  if (asset.brandSnapshot?.website) {
    try { return new URL(asset.brandSnapshot.website).hostname.toLowerCase() === currentHost; } catch { return false; }
  }
  return !asset.isFoundation && currentHost === "forma.example";
}

/** Save an editable campaign without creating a simulator scenario or reserving money. */
export function saveCampaignDraft(s, data, id) {
  const prior = id ? s.campaigns.find(c => c.id === id) : null;
  if (id) assert(prior?.isFoundation && prior.status === "Draft", "Only an editable campaign draft can be changed.");
  const input = { ...(prior ?? {}), ...data };
  const goalSentence = text(input.goalSentence ?? input.prompt ?? input.objective, 1000);
  assert(goalSentence.length >= 10, "Describe the result, customer, and market in one sentence.");
  const name = text(input.name || goalSentence, 100);
  assert(name.length >= 3, "Give the campaign a name.");
  const channel = input.channel === "PMax" ? "Performance Max" : input.channel;
  assert(["Search", "Performance Max"].includes(channel), "Choose Google Search or Performance Max.");
  assert(["conversions", "impressions"].includes(input.goal), "Choose conversions or impressions.");
  const destination = httpsUrl(input.destination ?? s.brand.website, "destination");
  const dailyBudget = dollars(input.dailyBudget, "daily budget"), days = Number(input.days);
  assert(dailyBudget > 0, "Daily budget must be greater than zero.");
  assert(Number.isInteger(days) && days >= 1 && days <= 90, "Choose a duration from 1 to 90 days.");
  const maximum = dollars(dailyBudget * days, "maximum campaign spend");
  const market = text(input.market ?? s.brand.market, 120), language = text(input.language ?? "English", 80);
  assert(market && language, "Choose the campaign market and language.");
  const creative = s.assets.find(a => a.id === input.creativeId);
  assert(creative, "Choose a Creative Set from Studio.");
  assert(creativeMatchesBrand(s, creative), "Create or select a Studio Creative Set for this business.");
  const draft = {
    ...(prior ?? {}), id: prior?.id ?? uid("campaign"), isFoundation: true,
    name, goalSentence, channel, goal: input.goal, destination, dailyBudget,
    days, market, language, creativeId: creative.id, maximum,
    brandVersion: s.brand.version, creativeVersion: creative.version,
    status: "Draft", spend: 0, clicks: 0, purchases: 0,
    createdAt: prior?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  if (prior) Object.assign(prior, draft); else s.campaigns.unshift(draft);
  log(s, `Saved campaign draft “${name}”. No funds reserved.`, "campaign");
  return prior ?? draft;
}

export function submitCampaignDraft(s, id, confirmed) {
  const c = s.campaigns.find(item => item.id === id);
  assert(c?.isFoundation, "Campaign draft not found.");
  if (c.submittedAt && c.status !== "Draft") return c;
  assert(c.status === "Draft", "This campaign is no longer editable.");
  assert(confirmed === true, "Confirm the maximum campaign spend before launching.");
  assert(!s.autonomyPaused, "New submissions are paused in this workspace.");
  const asset = s.assets.find(a => a.id === c.creativeId);
  assert(creativeMatchesBrand(s, asset), "The selected creative belongs to another business. Choose a matching Studio Creative Set.");
  assert(c.brandVersion === s.brand.version && c.creativeVersion === asset?.version, "The brand or creative changed. Save the campaign draft again before launch.");
  const gates = readiness(s, c.channel, c.goal, c.creativeId);
  assert(gates.every(g => g.ok), `${gates.find(g => !g.ok)?.label ?? "Campaign readiness"} is required.`);
  const amount = dollars(c.dailyBudget * c.days, "maximum campaign spend");
  assert(amount > 0 && amount === c.maximum, "Campaign budget changed. Review the draft again.");
  assert(s.wallet.available >= amount, "Top up the demo Wallet to cover the maximum campaign spend.");
  c.brandSnapshot = copy(s.brand);
  c.creativeSnapshot = copy(asset);
  c.snapshot = {
    brandVersion: s.brand.version, assetVersion: asset.version,
    draft: { budget: amount, days: c.days, channel: c.channel, goal: c.goal, assetId: c.creativeId, destination: c.destination, market: c.market, language: c.language, goalSentence: c.goalSentence },
    brand: copy(s.brand), creative: copy(asset),
  };
  s.wallet.available = Math.round((s.wallet.available - amount) * 100) / 100;
  s.wallet.reserved = Math.round((s.wallet.reserved + amount) * 100) / 100;
  c.status = "In Review";
  c.submittedAt = new Date().toISOString();
  log(s, `Submitted “${c.name}” for demo review. $${amount.toFixed(2)} reserved once.`, "campaign");
  return c;
}

export function createStudioSet(s, data) {
  assert(s.brand.complete, "Complete the Brand Profile before creating a Creative Set.");
  const name = text(data.name, 100);
  assert(name.length >= 3, "Give the Creative Set a name.");
  const headline = text(data.headline || `${s.brand.name}. Made for your everyday.`, 120);
  const subline = text(data.subline || s.brand.valueProposition || s.brand.tagline, 300);
  assert(headline && subline, "Add a headline and supporting copy.");
  const a = {
    id: uid("asset"), name, format: "Image set", status: "Ready", theme: ["cream", "orange", "navy", "paper", "soft"].includes(data.theme) ? data.theme : "cream",
    headline, subline, angle: text(data.angle || "Brand-led message", 120), version: 1,
    source: "Studio template · Demo sample", isFoundation: true, demo: true,
    textReady: true, landscape: true, square: true, brandVersion: s.brand.version,
    brandName: s.brand.name, brandSnapshot: copy(s.brand), createdAt: new Date().toISOString(),
  };
  s.assets.unshift(a);
  log(s, `Created sample Creative Set “${name}”. Uses a local template, not live image generation.`, "creative");
  return a;
}

export function updateTracking(s, method) {
  const key = String(method).toLowerCase().replaceAll(" ", "-");
  const normalized = ({ "google-tag-manager": "gtm", "manual-installation": "manual" })[key] ?? key;
  assert(["github", "gtm", "shopify", "manual"].includes(normalized), "Choose an available installation method.");
  const prior = s.tracker ?? {};
  s.tracker = { ...prior, method: normalized, installed: true, enabled: true, receiving: false, verified: false, events: prior.events ?? [], website: s.brand.website, source: "demo" };
  log(s, `Prepared ${normalized} demo tracking installation. Waiting for a sample event.`, "tracking");
  return s.tracker;
}

export function recordTrackingEvent(s, data) {
  assert(s.tracker?.installed && s.tracker.enabled, "Choose and prepare a Tracking installation method first.");
  const name = text(data.name ?? data.event, 80);
  assert(/^[a-zA-Z][a-zA-Z0-9_.:-]{1,79}$/.test(name), "Use a clear event name such as page_view, signup_completed, or purchase.");
  const value = dollars(data.value ?? 0, "event value");
  const conversion = data.conversion === true || data.conversion === "true" || data.conversion === "on";
  const event = { id: uid("event"), name, event: name, conversion, value, currency: "USD", source: "demo", demo: true, at: new Date().toISOString() };
  s.tracker.events ??= [];
  s.tracker.events.unshift(event);
  s.tracker.events = s.tracker.events.slice(0, 200);
  s.tracker.receiving = true;
  s.tracker.verified = true;
  if (conversion) s.tracker.conversionEvent = name;
  log(s, `Received demo X-Ray event “${name}”${conversion ? " marked as a conversion" : ""}.`, "tracking");
  return event;
}

/** Browser-only fixture adapter. No credentials, provider calls or real money. */
export const STORAGE_KEY = "hell_yeah2.workspace.v1";
export const copy = (value) => structuredClone(value);
export const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
export const number = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
export const assert = (value, message) => {
  if (!value) throw new Error(message);
};
export const uid = (prefix) =>
  `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
export function createInitialState() {
  return {
    version: 1,
    organizationId: "fixture_forma",
    mode: "fixture",
    range: 30,
    chartMetric: "purchases",
    autonomyPaused: false,
    brand: {
      name: "Forma",
      website: "https://forma.example",
      tagline: "Everyday essentials. Made to move.",
      market: "United States",
      version: 1,
      complete: true,
    },
    tracker: { enabled: true, receiving: true, verified: true },
    wallet: {
      available: 12000,
      reserved: 8500,
      spent: 18462,
      pendingRefund: 450,
    },
    campaigns: [
      {
        id: "c1",
        name: "Everyday essentials",
        channel: "Search",
        goal: "conversions",
        status: "Serving",
        spend: 12480,
        clicks: 8320,
        purchases: 486,
        creativeId: "a1",
        maximum: 15000,
      },
      {
        id: "c2",
        name: "The daily collection",
        channel: "Performance Max",
        goal: "conversions",
        status: "Serving",
        spend: 5982,
        clicks: 3738,
        purchases: 198,
        creativeId: "a2",
        maximum: 7500,
      },
      {
        id: "c3",
        name: "A better daily ritual",
        channel: "Search",
        goal: "conversions",
        status: "In Review",
        spend: 0,
        clicks: 0,
        purchases: 0,
        creativeId: "a3",
        maximum: 3000,
      },
      {
        id: "c4",
        name: "Weekend essentials",
        channel: "Search",
        goal: "conversions",
        status: "Paused",
        spend: 0,
        clicks: 0,
        purchases: 0,
        creativeId: "a4",
        maximum: 1500,
      },
    ],
    assets: [
      {
        id: "a1",
        name: "Built for your everyday",
        format: "Search copy",
        status: "Ready",
        theme: "cream",
        headline: "Good things.\nOn repeat.",
        subline: "Essentials that go the distance.",
        angle: "Everyday utility",
        version: 1,
        source: "Studio sample",
        textReady: true,
        landscape: true,
        square: true,
      },
      {
        id: "a2",
        name: "The daily collection",
        format: "Image set",
        status: "Ready",
        theme: "orange",
        headline: "Less,\nbut better.",
        subline: "Meet your new daily essentials.",
        angle: "Simplicity",
        version: 1,
        source: "Studio sample",
        textReady: true,
        landscape: true,
        square: true,
      },
      {
        id: "a3",
        name: "Make room for better",
        format: "Landing page",
        status: "Ready",
        theme: "navy",
        headline: "A little\nmore you.",
        subline: "Everyday, thoughtfully made.",
        angle: "Identity",
        version: 1,
        source: "Owned page sample",
        textReady: true,
        landscape: true,
        square: true,
      },
      {
        id: "a4",
        name: "Ready when you are",
        format: "Search copy",
        status: "Ready",
        theme: "paper",
        headline: "Take the\nlong way.",
        subline: "For wherever today takes you.",
        angle: "Adventure",
        version: 1,
        source: "Studio sample",
        textReady: true,
        landscape: false,
        square: false,
      },
      {
        id: "a5",
        name: "Everyday, reimagined",
        format: "Image set",
        status: "Generating",
        theme: "soft",
        headline: "Make every\nday count.",
        subline: "New perspectives, taking shape.",
        angle: "Routine",
        version: 1,
        source: "Studio sample",
        textReady: true,
        landscape: false,
        square: false,
      },
      {
        id: "a6",
        name: "Made to keep",
        format: "Image set",
        status: "Needs Attention",
        theme: "striped",
        headline: "Keep the\ngood stuff.",
        subline: "The things you come back to.",
        angle: "Durability",
        version: 1,
        source: "Studio sample",
        textReady: true,
        landscape: true,
        square: false,
      },
    ],
    experiments: [
      {
        id: "e1",
        name: "A clearer reason to choose Forma",
        hypothesis:
          "Benefit-led landing copy may increase purchases per assigned visitor.",
        status: "Running",
        assetId: "a1",
        metric: "Purchase rate",
        control: 200,
        treatment: 200,
        controlConversions: 20,
        treatmentConversions: 25,
        target: 5000,
        created: "Oct 12",
        started: true,
      },
      {
        id: "e2",
        name: "Find the right first impression",
        hypothesis:
          "A product-led hero may improve the landing-page purchase rate.",
        status: "Draft",
        assetId: "a2",
        metric: "Purchase rate",
        control: 0,
        treatment: 0,
        controlConversions: 0,
        treatmentConversions: 0,
        target: 5000,
        created: "Oct 17",
        started: false,
      },
      {
        id: "e3",
        name: "The shorter path to checkout",
        hypothesis: "A single landing-page CTA may reduce choice friction.",
        status: "Concluded",
        assetId: "a3",
        metric: "Purchase rate",
        control: 1800,
        treatment: 1800,
        controlConversions: 174,
        treatmentConversions: 183,
        target: 5000,
        created: "Sep 28",
        started: true,
      },
    ],
    scenarios: [],
    approvals: [],
    dismissed: [],
    captures: [],
    activity: [
      {
        id: "log1",
        text: "Landing-page experiment received 400 sample assignments.",
        kind: "experiment",
        at: "2026-10-18T12:00:00Z",
      },
      {
        id: "log2",
        text: "“A better daily ritual” entered campaign review.",
        kind: "campaign",
        at: "2026-10-18T11:15:00Z",
      },
      {
        id: "log3",
        text: "Creative Set v1 is ready in Studio.",
        kind: "creative",
        at: "2026-10-18T10:30:00Z",
      },
    ],
  };
}
export function readState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { state: createInitialState(), recovered: false };
    const s = JSON.parse(raw);
    assert(
      s.version === 1 &&
        s.mode === "fixture" &&
        s.organizationId === "fixture_forma",
      "Unsupported workspace",
    );
    for (const key of [
      "campaigns",
      "assets",
      "experiments",
      "scenarios",
      "approvals",
      "activity",
      "captures",
      "dismissed",
    ])
      assert(Array.isArray(s[key]), "Invalid saved data");
    assert(
      s.brand?.name &&
        Number.isInteger(s.brand.version) &&
        s.tracker &&
        s.wallet &&
        ["available", "reserved", "spent", "pendingRefund"].every(
          (k) => Number.isFinite(s.wallet[k]) && s.wallet[k] >= 0,
        ),
      "Invalid balances",
    );
    return { state: s, recovered: false };
  } catch {
    return { state: createInitialState(), recovered: true };
  }
}
export function saveState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
export function totals(s) {
  const factor = s.range / 30;
  const spend = Math.round(
    s.campaigns.reduce((n, c) => n + c.spend, 0) * factor,
  );
  const purchases = Math.round(
    s.campaigns.reduce((n, c) => n + c.purchases, 0) * factor,
  );
  return {
    spend,
    purchases,
    cpa: purchases ? spend / purchases : 0,
    active: s.experiments.filter((e) => e.status === "Running").length,
  };
}
export const readyAssets = (s) => s.assets.filter((a) => a.textReady);
export function readiness(
  s,
  channel = "Search",
  goal = "conversions",
  assetId = "a1",
) {
  const asset = s.assets.find((a) => a.id === assetId);
  return [
    { label: "Brand Profile complete", ok: s.brand.complete },
    {
      label:
        channel === "Performance Max"
          ? "Ad copy + final landscape and square selected"
          : "Ad copy ready in Studio",
      ok:
        channel === "Performance Max"
          ? asset?.textReady && asset?.landscape && asset?.square
          : asset?.textReady,
    },
    {
      label:
        goal === "conversions"
          ? "X-Ray receiving verified events"
          : "Tracking optional for impressions",
      ok:
        goal !== "conversions" ||
        (s.tracker.enabled && s.tracker.receiving && s.tracker.verified),
    },
    { label: "Hellyeah managed account", ok: true },
  ];
}
export const draftFingerprint = (draft) =>
  JSON.stringify([
    Number(draft.budget),
    Number(draft.days),
    draft.channel,
    draft.goal,
    draft.assetId,
  ]);
export function simulateDraft(draft) {
  const budget = Number(draft.budget),
    days = Number(draft.days);
  assert(
    Number.isFinite(budget) && budget >= 100 && budget <= 25000,
    "Enter a total budget between $100 and $25,000.",
  );
  assert(
    Number.isInteger(days) && days >= 7 && days <= 90,
    "Choose a duration between 7 and 90 days.",
  );
  assert(
    ["Search", "Performance Max"].includes(draft.channel),
    "Choose a supported channel.",
  );
  assert(
    ["conversions", "impressions"].includes(draft.goal),
    "Choose a supported goal.",
  );
  if (draft.channel !== "Search" || draft.goal !== "conversions")
    return {
      budget,
      days,
      channel: draft.channel,
      goal: draft.goal,
      planningOnly: true,
      fingerprint: draftFingerprint(draft),
      calibrated: false,
    };
  const cpc = 2,
    cvr = 0.055,
    clicks = Math.floor(budget / cpc),
    draws = 800;
  let seed = 17;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const samples = Array.from({ length: draws }, () => {
    let conversions = 0;
    for (let i = 0; i < clicks; i++) if (random() < cvr) conversions++;
    return conversions;
  }).sort((a, b) => a - b);
  const expected = samples.reduce((a, b) => a + b, 0) / draws;
  return {
    budget,
    days,
    channel: draft.channel,
    goal: draft.goal,
    planningOnly: false,
    expected,
    low: samples[Math.floor(draws * 0.1)],
    high: samples[Math.floor(draws * 0.9)],
    cpa: budget / expected,
    clicks,
    cpc,
    cvr,
    draws,
    seed: 17,
    calibrated: false,
    fingerprint: draftFingerprint(draft),
  };
}
export function log(s, text, kind = "system") {
  s.activity.unshift({
    id: uid("log"),
    text,
    kind,
    at: new Date().toISOString(),
  });
  s.activity = s.activity.slice(0, 50);
}
export function saveScenario(s, draft, result) {
  assert(
    result?.fingerprint === draftFingerprint(draft),
    "Inputs changed. Run the scenario again before saving.",
  );
  const scenario = {
    id: uid("scenario"),
    name: `${draft.channel} · ${money(Number(draft.budget))}`,
    draft: copy(draft),
    result: copy(result),
    brandVersion: s.brand.version,
    assetVersion: s.assets.find((a) => a.id === draft.assetId)?.version,
    createdAt: new Date().toISOString(),
  };
  s.scenarios.unshift(scenario);
  log(
    s,
    `Saved a ${money(Number(draft.budget))} planning scenario.`,
    "simulation",
  );
  return scenario;
}
export function queueScenario(s, id) {
  const scenario = s.scenarios.find((x) => x.id === id);
  assert(scenario, "Scenario not found.");
  const prior = s.approvals.find((x) => x.scenarioId === id);
  if (prior) return prior;
  assert(
    s.brand.version === scenario.brandVersion,
    "Brand Profile changed. Run and save a fresh scenario.",
  );
  const approval = {
    id: uid("approval"),
    scenarioId: id,
    status: "Pending",
    name: `${s.brand.name} · ${scenario.name}`,
    draft: copy(scenario.draft),
    brandVersion: scenario.brandVersion,
    assetVersion: scenario.assetVersion,
  };
  s.approvals.unshift(approval);
  log(s, "A saved scenario is ready for exact-plan review.", "approval");
  return approval;
}
export function submitApproval(s, id, confirmed) {
  const a = s.approvals.find((x) => x.id === id);
  assert(a, "Review item not found.");
  if (a.status === "Submitted")
    return s.campaigns.find((c) => c.approvalId === id);
  assert(a.status === "Pending", "This review is closed.");
  assert(confirmed, "Confirm the exact total budget before submitting.");
  assert(!s.autonomyPaused, "Submissions are paused in this workspace.");
  assert(
    a.brandVersion === s.brand.version,
    "Brand Profile changed. Create a new scenario for review.",
  );
  assert(
    a.assetVersion === s.assets.find((x) => x.id === a.draft.assetId)?.version,
    "Creative version changed. Create a new scenario for review.",
  );
  const gates = readiness(s, a.draft.channel, a.draft.goal, a.draft.assetId);
  assert(
    gates.every((x) => x.ok),
    gates.find((x) => !x.ok)?.label + " is required.",
  );
  const budget = Number(a.draft.budget);
  assert(Number.isFinite(budget) && budget > 0, "Invalid campaign budget.");
  assert(
    s.wallet.available >= budget,
    "Insufficient available demo funds. Add demo funds in Wallet.",
  );
  s.wallet.available -= budget;
  s.wallet.reserved += budget;
  a.status = "Submitted";
  const campaign = {
    id: uid("campaign"),
    approvalId: id,
    name: a.name,
    channel: a.draft.channel,
    goal: a.draft.goal,
    status: "In Review",
    spend: 0,
    clicks: 0,
    purchases: 0,
    maximum: budget,
    creativeId: a.draft.assetId,
    snapshot: copy(a),
  };
  s.campaigns.unshift(campaign);
  log(
    s,
    `${a.name} entered review. ${money(budget)} reserved once in the demo Wallet.`,
    "campaign",
  );
  return campaign;
}
export function createExperiment(s, { name, hypothesis, assetId }) {
  assert(
    name?.trim().length >= 3,
    "Give the experiment a name of at least 3 characters.",
  );
  assert(
    hypothesis?.trim().length >= 15,
    "Describe the hypothesis in at least 15 characters.",
  );
  assert(
    s.assets.some((a) => a.id === assetId),
    "Select a creative.",
  );
  const e = {
    id: uid("experiment"),
    name: name.trim().slice(0, 100),
    hypothesis: hypothesis.trim().slice(0, 1000),
    assetId,
    creativeVersion: s.assets.find(a => a.id === assetId).version,
    creativeSnapshot: copy(s.assets.find(a => a.id === assetId)),
    status: "Draft",
    metric: "Purchase rate",
    control: 0,
    treatment: 0,
    controlConversions: 0,
    treatmentConversions: 0,
    target: 5000,
    created: "Today",
    started: false,
  };
  s.experiments.unshift(e);
  log(s, `Created experiment draft “${e.name}”.`, "experiment");
  return e;
}
export function transitionExperiment(s, id) {
  const e = s.experiments.find((e) => e.id === id);
  assert(e, "Experiment not found.");
  assert(e.status !== "Concluded", "Concluded experiments are immutable.");
  if (e.status === "Running") {
    e.status = "Paused";
    log(s, `Paused demo experiment “${e.name}”.`, "experiment");
    return;
  }
  assert(!s.autonomyPaused, "Workspace submissions are paused.");
  assert(
    readiness(s, "Search", "conversions", e.assetId).every((g) => g.ok),
    "Complete Brand, Studio and X-Ray readiness first.",
  );
  e.status = "Running";
  e.started = true;
  log(
    s,
    `Started demo experiment “${e.name}”. No real traffic is assigned.`,
    "experiment",
  );
}
export function updateBrand(s, { name, website, tagline }) {
  assert(name?.trim().length >= 2, "Enter a brand name.");
  let url;
  try {
    url = new URL(website);
  } catch {
    throw new Error("Enter a complete website URL.");
  }
  assert(url.protocol === "https:", "Use a secure https:// website URL.");
  s.brand = {
    ...s.brand,
    name: name.trim().slice(0, 60),
    website: url.href,
    tagline: tagline.trim().slice(0, 160),
    version: s.brand.version + 1,
    complete: true,
  };
  log(s, "Brand Profile updated. Existing submitted snapshots are unchanged.");
}

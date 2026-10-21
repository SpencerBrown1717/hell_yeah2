import { assert, copy, uid, log, money, readiness, simulateDraft, saveScenario, createExperiment } from "./model.mjs";
import { demoEvidence } from "./demo-evidence.mjs";

export function demoContext(s) {
  const run = s.demoJourney;
  const scenario = s.scenarios.find(x => x.id === run?.scenarioId);
  const approval = s.approvals.find(x => x.scenarioId === scenario?.id);
  const campaign = s.campaigns.find(x => x.approvalId && x.approvalId === approval?.id);
  const experiment = s.experiments.find(x => x.id === run?.experimentId);
  const step = !scenario ? 0 : !campaign ? 1 : campaign.status === "In Review" ? 2 : !experiment?.sampleEvidence ? 3 : 4;
  return { run, scenario, approval, campaign, experiment, step };
}

export function startDemo(s, { assetId = "a1", budget = 3000, days = 14 } = {}) {
  const old = demoContext(s);
  assert(!old.campaign || old.campaign.status === "Completed", "Finish the current demo campaign before starting another plan.");
  assert(readiness(s, "Search", "conversions", assetId).every(x => x.ok), "Complete Brand, Studio and X-Ray readiness first.");
  const draft = { assetId, budget: Number(budget), days: Number(days), channel: "Search", goal: "conversions" };
  const scenario = saveScenario(s, draft, simulateDraft(draft));
  const asset = s.assets.find(x => x.id === assetId);
  s.demoJourney = { id: uid("demo"), scenarioId: scenario.id, creative: copy(asset), createdAt: new Date().toISOString() };
  return s.demoJourney;
}

export function attachScenarioToDemo(s, id) {
  const prior = demoContext(s);
  if (prior.scenario?.id === id) return prior.run;
  assert(!prior.campaign || prior.campaign.status === "Completed", "Finish the current demo campaign before switching plans.");
  const scenario = s.scenarios.find(x => x.id === id);
  assert(scenario?.draft.channel === "Search" && scenario.draft.goal === "conversions", "The connected outcome demo supports Search purchases. Other scopes can still be sent to OS research.");
  const asset = s.assets.find(x => x.id === scenario.draft.assetId);
  const approval = s.approvals.find(x => x.scenarioId === id);
  const campaign = s.campaigns.find(x => x.approvalId && x.approvalId === approval?.id);
  assert(campaign?.demoCreativeSnapshot || (asset && asset.version === scenario.assetVersion && s.brand.version === scenario.brandVersion), "Brand or creative changed. Save a fresh scenario first.");
  const experiment = s.experiments.find(x => campaign && x.demoCampaignId === campaign.id);
  s.demoJourney = { id: campaign?.demoRunId ?? uid("demo"), scenarioId: id, creative: copy(campaign?.demoCreativeSnapshot ?? asset), createdAt: new Date().toISOString(), ...((campaign?.demoWalletAvailableMicros !== null && campaign?.demoWalletAvailableMicros !== undefined) ? { walletAvailableMicros: campaign.demoWalletAvailableMicros } : {}), ...(experiment ? { experimentId: experiment.id } : {}) };
  return s.demoJourney;
}

export function approveDemoCampaign(s, id) {
  const c = s.campaigns.find(x => x.id === id);
  assert(c, "Campaign not found.");
  if (c.status === "Serving") return c;
  assert(c.status === "In Review", "Only campaigns in review can be approved.");
  assert(!s.autonomyPaused, "Submissions are paused. Resume them in Settings first.");
  assert(readiness(s, c.channel, c.goal, c.creativeId).every(x => x.ok), "Complete the campaign readiness checks first.");
  c.status = "Serving";
  c.demoReviewedAt = new Date().toISOString();
  log(s, `Demo review approved for “${c.name}”. Sample delivery is ready; the budget reservation is unchanged.`, "demo");
  return c;
}

export function designDemoExperiment(s) {
  const { run, campaign, experiment } = demoContext(s);
  if (experiment) return experiment;
  assert(campaign?.status === "Serving", "Approve the demo campaign review first.");
  const e = createExperiment(s, {
    name: `${run.creative.angle} · landing-page test`,
    hypothesis: `Making the ${run.creative.angle.toLowerCase()} benefit explicit may improve purchases per assigned visitor.`,
    assetId: run.creative.id,
  });
  e.demoCampaignId = campaign.id;
  e.creativeVersion = run.creative.version;
  e.creativeSnapshot = copy(run.creative);
  campaign.demoRunId = run.id;
  campaign.demoCreativeSnapshot = copy(run.creative);
  run.experimentId = e.id;
  return e;
}

export function completeDemoExperiment(s, id, outcome) {
  const e = s.experiments.find(x => x.id === id);
  assert(e, "Experiment not found.");
  if (e.sampleEvidence) {
    assert(e.sampleEvidence.outcome === outcome, "This sample run is complete. Start a new demo to compare another outcome.");
    return e.sampleEvidence;
  }
  assert(e.status === "Running", "Start or resume this demo experiment first.");
  assert(!s.autonomyPaused, "Submissions are paused. Resume them in Settings first.");
  const c = s.campaigns.find(x => x.id === e.demoCampaignId);
  if (e.demoCampaignId) assert(c?.status === "Serving", "Resume the linked demo campaign before generating results.");
  const evidence = demoEvidence({ budget_micros: Math.round((c?.maximum ?? 3000) * 1e6), outcome });
  if (c) {
    assert(c.snapshot && c.spend === 0 && !c.demoSettled, "This campaign has already been settled or has no demo reservation.");
    assert(s.wallet.reserved >= c.maximum, "The reserved balance changed. Restore the demo before continuing.");
    s.wallet.reserved -= c.maximum;
    s.wallet.available += evidence.released_micros / 1e6;
    s.wallet.spent += evidence.spend_micros / 1e6;
    Object.assign(c, { spend: evidence.spend_micros / 1e6, purchases: evidence.purchases, clicks: evidence.clicks, status: "Completed", demoSettled: true, sampleEvidence: copy(evidence) });
    c.demoWalletAvailableMicros = Math.round(s.wallet.available * 1e6);
    log(s, `Demo campaign completed: ${money(c.spend)} sample spend; ${money(evidence.released_micros / 1e6)} unused funds returned. Fees are illustrative and are not charged to this demo Wallet.`, "demo");
  }
  Object.assign(e, { status: "Concluded", sampleEvidence: copy(evidence), control: evidence.control, treatment: evidence.treatment, controlConversions: evidence.controlConversions, treatmentConversions: evidence.treatmentConversions });
  log(s, `Generated explicit synthetic results for “${e.name}”. Descriptive only; no statistical winner is declared.`, "demo");
  return evidence;
}

export function demoPayload(s) {
  const { run, scenario, campaign, experiment } = demoContext(s);
  assert(run && scenario && campaign?.demoSettled && experiment?.sampleEvidence, "Complete the connected sample campaign and experiment first.");
  const a = run.creative;
  // Capture the same funding context on retry, even if the local Wallet later changes.
  return {
    run_id: run.id,
    creative: { id: a.id, name: a.name, version: a.version, angle: a.angle, headline: a.headline, subline: a.subline },
    scenario: { id: scenario.id, budget_micros: Math.round(campaign.maximum * 1e6), days: Number(scenario.draft.days), channel: "Search", goal: "conversions", brand_version: scenario.brandVersion },
    campaign_id: campaign.id,
    experiment: { id: experiment.id, name: experiment.name, hypothesis: experiment.hypothesis },
    outcome: experiment.sampleEvidence.outcome,
    wallet_available_micros: run.walletAvailableMicros ?? Math.round(s.wallet.available * 1e6),
  };
}

export function prepareDemoLearning(s) {
  const payload = demoPayload(s);
  s.demoJourney.walletAvailableMicros = payload.wallet_available_micros;
  const campaign = s.campaigns.find(c => c.id === payload.campaign_id);
  if (campaign) campaign.demoWalletAvailableMicros = payload.wallet_available_micros;
  return payload;
}

// Reopen a completed experiment's frozen recipe without replacing an active campaign.
export function learningForExperiment(s, id) {
  const experiment = s.experiments.find(e => e.id === id);
  assert(experiment?.sampleEvidence && experiment.demoCampaignId, "Complete a linked campaign experiment first.");
  if (demoContext(s).experiment?.id === id) return prepareDemoLearning(s);
  const campaign = s.campaigns.find(c => c.id === experiment.demoCampaignId);
  const approval = s.approvals.find(a => a.id === campaign?.approvalId);
  assert(approval && campaign.demoRunId && campaign.demoCreativeSnapshot, "Open this experiment in the campaign guide to restore its source context.");
  const snapshot = copy(s);
  snapshot.demoJourney = null;
  attachScenarioToDemo(snapshot, approval.scenarioId);
  return prepareDemoLearning(snapshot);
}

export function finishDemoAsset(s, id) {
  const a = s.assets.find(x => x.id === id);
  assert(a, "Creative not found.");
  if (a.status === "Ready") return;
  Object.assign(a, { status: "Ready", textReady: true, landscape: true, square: true, version: a.version + 1 });
  log(s, `Completed the bundled sample creative “${a.name}”, version ${a.version}.`, "demo");
}

export function creativeFromCapture(s, id) {
  const capture = s.captures.find(x => x.id === id);
  assert(capture, "Research capture not found.");
  const existing = s.assets.find(x => x.captureId === id);
  if (existing) return existing;
  const asset = {
    id: uid("asset"), name: capture.label, format: "Landing page", status: "Ready", theme: "navy",
    headline: capture.headline ?? "A little\nmore you.", subline: capture.subline ?? "Everyday essentials. Made to move.",
    angle: capture.angle ?? "Everyday utility", version: 1, textReady: true, landscape: true, square: true,
    source: "Labelled research sample; no live capture", captureId: capture.id,
  };
  s.assets.unshift(asset);
  log(s, `Prepared sample creative from research “${capture.label}”.`, "demo");
  return asset;
}

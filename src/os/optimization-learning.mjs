import { digest } from "./contracts.mjs";
import { synthesizeFeedback } from "./feedback.mjs";
import { STRATEGIES, cohortKey } from "./optimization-contracts.mjs";

export const OPTIMIZATION_VERSION = "bounded-trial-learning-v1";
const DAY = 864e5;
export function usableTrial(trial, at) {
  const r = trial.report, d = trial.design, now = Date.parse(at);
  return !!r && r.finalized && r.assignment_verified && r.bounds_verified && r.tracker_verified && !r.guardrail_violation
    && r.control.units === d.target_per_arm && r.candidate.units === d.target_per_arm
    && Date.parse(d.mature_after) <= now && Date.parse(r.observed_at) <= now
    && now - Date.parse(d.ends_at) <= 90 * DAY;
}
export function strategyContributions(context, at) {
  if (!context.config.enabled || !context.config.share_learning) return [];
  return STRATEGIES.flatMap(strategy => {
    const trials = context.trials.filter(t => t.design.strategy_id === strategy && usableTrial(t, at));
    if (!trials.length) return [];
    const n = trials.reduce((s,t) => s + t.report.control.units, 0);
    const count = arm => trials.reduce((s,t) => s + t.report[arm].qualified, 0);
    return [{
      source_mode: context.config.source_mode, cohort: cohortKey(context.config), strategy,
      control_q: Math.round(100 * count("control") / n),
      candidate_q: Math.round(100 * count("candidate") / n),
      observed_at: new Date(Math.max(...trials.map(t => Date.parse(t.design.ends_at)))).toISOString(),
    }];
  });
}
export function releaseStrategyCohort(rows) {
  const summary = {};
  for (const strategy of STRATEGIES) {
    const row = rows.find(r => r.strategy === strategy), n = row?.participants ?? 0;
    summary[strategy] = n >= 5 ? {
      available: true, participants: n,
      control_rate: Math.round(row.control_q / n / 5) * 0.05,
      candidate_rate: Math.round(row.candidate_q / n / 5) * 0.05,
    } : { available: false, participants: 0, control_rate: 0.5, candidate_rate: 0.5 };
  }
  return summary;
}
const mean = (arm, field) => arm.units ? arm[field] / arm.units : 0;
// Hoeffding: bounded independent outcomes, fixed registered cutoff; no normal approximation.
const radius = (n, range, alpha) => n ? range * Math.sqrt(Math.log(2 / alpha) / (2 * n)) : Infinity;
export function learnStrategies(context, aggregate, feedback, at) {
  const blockers = synthesizeFeedback(feedback).blocker_ids;
  // Spending across evidence revisions and four strategy families. Cohort changes never certify promotion.
  const alpha = 0.05 * 6 / (Math.PI ** 2 * Math.max(1, context.evidence_version) ** 2 * STRATEGIES.length);
  const strategies = STRATEGIES.map(strategy => {
    const all = context.trials.filter(t => t.design.strategy_id === strategy);
    const eligible = all.filter(t => usableTrial(t, at));
    const latest = [...all].sort((a,b) => Date.parse(b.design.ends_at) - Date.parse(a.design.ends_at)).at(0);
    const network = aggregate[strategy];
    const prior = network.available ? 20 : 2;
    const totals = arm => eligible.reduce((s,t) => ({ n: s.n + t.report[arm].units, q: s.q + t.report[arm].qualified }), { n: 0, q: 0 });
    const c = totals("control"), t = totals("candidate");
    const estimatedControl = (c.q + prior * network.control_rate) / (c.n + prior);
    const estimatedCandidate = (t.q + prior * network.candidate_rate) / (t.n + prior);
    let qualityLower = null, contributionLower = null, contributionDelta = null, roi = null, roiLower = null;
    const reasons = [];
    if (!context.config.enabled) reasons.push("Learning is paused");
    if (blockers.length) reasons.push("Resolve material customer feedback");
    if (!latest || !usableTrial(latest, at)) reasons.push("Latest registered trial needs complete, mature, verified evidence");
    else {
      const a = latest.report.control, b = latest.report.candidate, bound = latest.design.contribution_bound_usd;
      qualityLower = b.qualified / b.units - a.qualified / a.units - radius(a.units, 1, alpha / 4) - radius(b.units, 1, alpha / 4);
      contributionDelta = mean(b, "contribution_sum_usd") - mean(a, "contribution_sum_usd");
      contributionLower = contributionDelta - radius(a.units, 2 * bound, alpha / 4) - radius(b.units, 2 * bound, alpha / 4);
      roi = b.acquisition_cost_usd > 0 ? b.contribution_sum_usd / b.acquisition_cost_usd : null;
      roiLower = b.acquisition_cost_usd > 0 ? (b.contribution_sum_usd - b.units * radius(b.units, 2 * bound, alpha / 4)) / b.acquisition_cost_usd : null;
      if (qualityLower <= 0) reasons.push("Personal conversion improvement is not established");
      if (contributionLower <= 0) reasons.push("Personal contribution improvement is not established");
      if (roiLower === null || roiLower * 10000 < context.config.min_roi_bps) reasons.push("Conservative customer contribution ROI is below the floor");
    }
    const canReview = reasons.length === 0;
    return {
      strategy_id: strategy,
      action: canReview ? "review_campaign_draft" : eligible.length ? "hold_or_retest" : "collect_evidence",
      estimated_quality_lift: estimatedCandidate - estimatedControl,
      personal_units: t.n, personal_weight: t.n / (t.n + prior), prior_strength: prior,
      network, personal_quality_lower: qualityLower, contribution_delta_per_unit_usd: contributionDelta,
      contribution_lower_per_unit_usd: contributionLower, candidate_roi: roi, candidate_roi_lower: roiLower,
      latest_trial_id: latest?.design.trial_id ?? null, reasons,
    };
  }).sort((a,b) => (b.action === "review_campaign_draft") - (a.action === "review_campaign_draft") || b.estimated_quality_lift - a.estimated_quality_lift);
  const inputHash = digest({
    version: OPTIMIZATION_VERSION, config: context.config, config_version: context.config_version,
    trials: context.trials, evidence_version: context.evidence_version, aggregate, blockers,
    eligibility: context.trials.map(t => usableTrial(t, at)),
  });
  return {
    version: OPTIMIZATION_VERSION, source_mode: context.config.source_mode, at,
    input_hash: inputHash, evidence_version: context.evidence_version,
    valid_until: new Date(Date.parse(at) + DAY).toISOString(),
    strategies, eligible_strategies: strategies.filter(s => s.action === "review_campaign_draft").length,
    improvement_claim: null, live_execution: false, alpha_budget: alpha,
    method: "Bounded fixed-cutoff randomized trials; personal Hoeffding bounds with an evidence-revision alpha budget. Network priors rank research; they do not establish personal profit.",
  };
}

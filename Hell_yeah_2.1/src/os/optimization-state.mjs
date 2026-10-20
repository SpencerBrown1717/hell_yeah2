import { z } from "zod";
import { requireValue, digest } from "./contracts.mjs";
import { optimizationConfig, trialDesign, trialReport, draftReceipt, sourceMode, cohortKey } from "./optimization-contracts.mjs";

export function optimizationContext(state, mode) {
  const context = state.optimization?.[sourceMode.parse(mode)];
  requireValue(context, "OPTIMIZATION_NOT_CONFIGURED", "Configure this evidence mode first.", 409);
  return context;
}
export function applyOptimization(state, command, context) {
  const { kind, payload } = command, events = [];
  const event = data => events.push({ type: kind.replace("optimization_", "optimization."), data });
  if (kind === "optimization_configure") {
    const p = z.object({ expected_version: z.number().int().min(0), config: optimizationConfig }).strict().parse(payload);
    state.optimization ??= {};
    const old = state.optimization[p.config.source_mode];
    requireValue((old?.config_version ?? 0) === p.expected_version, "STALE_OPTIMIZATION_CONFIG", "Learning settings changed. Reload first.", 409);
    requireValue(!old?.trials.length || cohortKey(old.config) === cohortKey(p.config), "COHORT_IMMUTABLE", "An account with registered trials cannot change its cohort.", 409);
    state.optimization[p.config.source_mode] = {
      config: p.config, config_version: p.expected_version + 1, evidence_version: old?.evidence_version ?? 0,
      trials: old?.trials ?? [], proposals: old?.proposals ?? [], model: old?.model ?? null,
    };
    event(p);
  } else if (kind === "optimization_register") {
    const p = trialDesign.parse(payload), c = optimizationContext(state, p.source_mode);
    requireValue(p.organization_id === context.organization_id, "ORGANIZATION_DENIED", "Trial belongs to another account.", 403);
    requireValue(Date.parse(p.registered_at) <= Date.parse(p.starts_at) && Date.parse(p.starts_at) < Date.parse(p.ends_at)
      && Date.parse(p.ends_at) <= Date.parse(p.mature_after) && Date.parse(p.registered_at) <= Date.parse(context.at),
    "TRIAL_TIME", "Trial must be registered before its fixed outcome window.");
    requireValue(p.control_hash !== p.candidate_hash, "IDENTICAL_VARIANTS", "A trial requires distinct variants.");
    const hash = digest(p), old = c.trials.find(t => t.design.trial_id === p.trial_id);
    if (old) requireValue(old.design_hash === hash, "TRIAL_IMMUTABLE", "A registered design cannot be edited.", 409);
    else {
      requireValue(Date.parse(context.at) <= Date.parse(p.starts_at), "LATE_REGISTRATION", "Register the trial before enrollment starts; backdated designs cannot establish a win.", 409);
      requireValue(c.trials.length < 60, "PILOT_RECORD_LIMIT", "Export and extend retention before registering more than 60 trials.", 409);
      requireValue(c.trials.every(t => Date.parse(p.starts_at) >= Date.parse(t.design.ends_at) || Date.parse(p.ends_at) <= Date.parse(t.design.starts_at)),
        "OVERLAPPING_TRIALS", "This account must use non-overlapping trial windows to avoid reusing randomized units.", 409);
      c.trials.push({ design: p, design_hash: hash, report: null, report_hash: null });
      event({ trial_id: p.trial_id, design_hash: hash, source_mode: p.source_mode });
    }
  } else if (kind === "optimization_report") {
    const p = trialReport.parse(payload), c = optimizationContext(state, p.source_mode);
    requireValue(p.organization_id === context.organization_id, "ORGANIZATION_DENIED", "Report belongs to another account.", 403);
    const trial = c.trials.find(t => t.design.trial_id === p.trial_id);
    requireValue(trial && trial.design_hash === p.design_hash, "TRIAL_DESIGN_MISMATCH", "Report must reference the exact registered design.", 409);
    const d = trial.design, hash = digest(p);
    requireValue(Date.parse(p.observed_at) <= Date.parse(context.at) && Date.parse(p.observed_at) >= Date.parse(d.starts_at), "REPORT_TIME", "Invalid report observation time.");
    if (p.finalized) requireValue(Date.parse(p.observed_at) >= Date.parse(d.mature_after), "OUTCOMES_IMMATURE", "Final outcomes have not matured.");
    for (const arm of [p.control, p.candidate]) {
      requireValue(arm.units <= d.target_per_arm && (!p.finalized || arm.units === d.target_per_arm), "FIXED_HORIZON", "Final arms must reach the registered cutoff exactly.");
      requireValue(Math.abs(arm.contribution_sum_usd) <= arm.units * d.contribution_bound_usd, "REWARD_BOUND", "Contribution lies outside the registered per-unit bounds.");
      requireValue(arm.units > 0 || arm.acquisition_cost_usd === 0, "EMPTY_ARM_COST", "An empty arm cannot have acquisition costs.");
    }
    const old = trial.report;
    requireValue(!old || p.source_revision >= old.source_revision, "STALE_REPORT", "A newer outcome revision is already stored.", 409);
    if (old?.source_revision === p.source_revision) requireValue(trial.report_hash === hash, "SOURCE_EVENT_CONFLICT", "This revision has different evidence.", 409);
    else {
      requireValue(!old || Date.parse(p.observed_at) >= Date.parse(old.observed_at), "REPORT_TIME", "A correction cannot move observation time backwards.");
      trial.report = p; trial.report_hash = hash; c.evidence_version++;
      event({ trial_id: p.trial_id, source_revision: p.source_revision, source_mode: p.source_mode, report_hash: hash });
    }
  } else if (kind === "optimization_propose") {
    const p = z.object({ source_mode: sourceMode, strategy_id: z.string(), input_hash: z.string().length(64) }).strict().parse(payload);
    const c = optimizationContext(state, p.source_mode), model = c.model;
    requireValue(model && model.input_hash === p.input_hash && Date.parse(model.valid_until) > Date.parse(context.at), "STALE_OPTIMIZATION", "Evidence changed. Review the refreshed recommendation.", 409);
    const strategy = model.strategies.find(s => s.strategy_id === p.strategy_id);
    requireValue(strategy?.action === "review_campaign_draft", "OPTIMIZATION_NOT_READY", "Personal evidence does not support this campaign change.", 409);
    const trial = c.trials.find(t => t.design.trial_id === strategy.latest_trial_id);
    const plan = {
      source_mode: p.source_mode, organization_id: context.organization_id, strategy_id: p.strategy_id,
      trial_id: trial.design.trial_id, design_hash: trial.design_hash, input_hash: p.input_hash,
      campaign_id: trial.design.campaign_id, managed_account_id: trial.design.managed_account_id,
      brand_version: trial.design.brand_version, creative_version: trial.design.creative_version,
      candidate_hash: trial.design.candidate_hash, existing_budget_micros: trial.design.existing_budget_micros,
      requested_budget_micros: trial.design.existing_budget_micros, spend_authority: false,
    };
    const plan_hash = digest(plan), id = "change_" + plan_hash.slice(0, 24);
    if (!c.proposals.some(x => x.id === id)) {
      requireValue(c.proposals.length < 50, "PILOT_RECORD_LIMIT", "Export draft history before extending retention.", 409);
      c.proposals.push({ id, plan, plan_hash, status: "Ready for platform draft", approved_by: context.actor_id, approved_at: context.at, receipt: null });
      event({ id, plan_hash, source_mode: p.source_mode, spend_authority: false });
    }
  } else if (kind === "optimization_receipt") {
    const p = draftReceipt.parse(payload), c = optimizationContext(state, p.source_mode);
    requireValue(p.organization_id === context.organization_id, "ORGANIZATION_DENIED", "Draft receipt belongs to another account.", 403);
    const proposal = c.proposals.find(x => x.id === p.proposal_id);
    requireValue(proposal && proposal.plan_hash === p.plan_hash && p.operation_id === proposal.id, "DRAFT_MISMATCH", "Receipt must match the approved draft plan and operation.", 409);
    requireValue(!proposal.receipt || digest(proposal.receipt) === digest(p), "SOURCE_EVENT_CONFLICT", "A different draft receipt is already recorded.", 409);
    if (!proposal.receipt) { proposal.receipt = p; proposal.status = "Draft prepared"; event(p); }
  } else requireValue(false, "UNKNOWN_COMMAND", "Unknown optimization command.");
  return { state, events, reevaluate: false, optimization: true };
}

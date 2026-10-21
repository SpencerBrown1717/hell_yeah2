import { z } from "zod";
import { intMoney } from "./contracts.mjs";

export const STRATEGIES = ["creative_proof", "offer_clarity", "audience_refinement", "landing_message"];
export const sourceMode = z.enum(["fixture", "live"]);
const ref = z.string().min(1).max(100);
export const optimizationConfig = z.object({
  source_mode: sourceMode,
  enabled: z.boolean(),
  share_learning: z.boolean(),
  industry: z.enum(["home_services", "retail", "software", "education", "fitness", "other"]),
  country: z.string().regex(/^[A-Z]{2}$/),
  channel: z.literal("Search"),
  currency: z.literal("USD"),
  metric: z.literal("qualified_conversion_v1"),
  min_roi_bps: z.number().int().min(0).max(50000),
}).strict();
export const trialDesign = z.object({
  source_mode: sourceMode,
  organization_id: ref,
  trial_id: ref,
  strategy_id: z.enum(STRATEGIES),
  registered_at: z.iso.datetime(),
  starts_at: z.iso.datetime(),
  ends_at: z.iso.datetime(),
  mature_after: z.iso.datetime(),
  target_per_arm: z.number().int().min(300).max(1000000),
  randomization_unit: z.literal("independent_customer"),
  allocation_bps: z.literal(5000),
  contribution_bound_usd: z.number().positive().max(10000),
  campaign_id: ref,
  managed_account_id: ref,
  brand_version: z.number().int().positive(),
  creative_version: z.number().int().positive(),
  control_hash: z.string().regex(/^[a-f0-9]{64}$/),
  candidate_hash: z.string().regex(/^[a-f0-9]{64}$/),
  existing_budget_micros: intMoney.min(1),
}).strict();
const arm = z.object({
  units: z.number().int().min(0).max(1000000),
  qualified: z.number().int().min(0),
  contribution_sum_usd: z.number().finite().min(-1e10).max(1e10),
  acquisition_cost_usd: z.number().finite().min(0).max(1e10),
}).strict().refine(x => x.qualified <= x.units, "Qualified outcomes exceed assigned units.");
export const trialReport = z.object({
  source_mode: sourceMode, organization_id: ref, trial_id: ref,
  design_hash: z.string().length(64),
  source_revision: z.number().int().positive().max(1000000),
  observed_at: z.iso.datetime(),
  finalized: z.boolean(),
  assignment_verified: z.boolean(),
  bounds_verified: z.boolean(),
  tracker_verified: z.boolean(),
  guardrail_violation: z.boolean(),
  control: arm, candidate: arm,
}).strict();
export const optimizationReportBatch = z.object({ reports: z.array(trialReport).min(1).max(10) }).strict();
export const draftReceipt = z.object({
  source_mode: sourceMode, organization_id: ref, proposal_id: ref,
  operation_id: ref, draft_id: ref,
  status: z.literal("Draft"),
  plan_hash: z.string().length(64),
  reserved_micros: z.literal(0),
  launched: z.literal(false),
}).strict();
export const cohortKey = config => [config.industry, config.country, config.channel, config.currency, config.metric].join(":");

import { z } from "zod";
import { digest, requireValue } from "./contracts.mjs";
import { demoEvidence } from "../../web/js/demo-evidence.mjs";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const productDemoSchema = z.object({
  run_id: id,
  creative: z.object({ id, name: z.string().min(1).max(100), version: z.number().int().min(1).max(100000), angle: z.string().min(1).max(200), headline: z.string().min(1).max(1000), subline: z.string().max(1000) }).strict(),
  scenario: z.object({ id, budget_micros: z.number().int().min(100e6).max(25000e6), days: z.number().int().min(7).max(90), channel: z.literal("Search"), goal: z.literal("conversions"), brand_version: z.number().int().min(1).max(100000) }).strict(),
  campaign_id: id,
  experiment: z.object({ id, name: z.string().min(3).max(100), hypothesis: z.string().min(15).max(1000) }).strict(),
  outcome: z.enum(["healthy", "poor", "limited"]),
  wallet_available_micros: z.number().int().min(0).max(1e13),
}).strict();

/** Replay only synthetic evidence in an isolated, non-enrolled workspace.
 * The user's economic snapshot, feedback and aggregate consent are untouched. */
export async function runProductDemo({ repository, actor_id, organization_id, key, payload }) {
  requireValue(typeof key === "string" && /^[a-zA-Z0-9._:-]{8,128}$/.test(key), "IDEMPOTENCY_KEY", "Use a stable demo request key.");
  const input = productDemoSchema.parse(payload);
  const identity = { kind: "product_demo", payload: input };
  const existing = await repository.operation(organization_id, key, identity, actor_id);
  if (existing) return existing;
  const run_id = digest([organization_id, input]).slice(0, 24);
  const trialOrg = `fixture_demo_${run_id}`;
  const initial = await repository.ensureWorkspace(trialOrg);
  const at = initial.state.snapshot.at;
  const stats = demoEvidence({ budget_micros: input.scenario.budget_micros, outcome: input.outcome });
  const report = {
    source: "fixture_hellyeah_google", source_mode: "fixture", organization_id: trialOrg,
    scope: "managed_account_rollup", campaign_ids: [input.campaign_id], managed_account_id: `fixture_demo_${run_id}`,
    source_revision: 2, period_start: new Date(Date.parse(at) - input.scenario.days * 864e5).toISOString(), period_end: at, observed_at: at,
    currency: "USD", channel: "Search", spend_micros: stats.spend_micros, net_revenue_micros: stats.net_revenue_micros,
    margin_bps: stats.margin_bps, fee_bps: stats.fee_bps, mature: stats.mature, mature_conversions: stats.purchases, tracker_verified: true,
    current_budget_micros: input.scenario.budget_micros, wallet_available_micros: input.wallet_available_micros,
    eligible: stats.eligible, qualified: stats.qualified,
    marginal: { certification: "synthetic_passing_case", expires_at: new Date(Date.parse(at) + 7 * 864e5).toISOString(), bounds: [
      { max_increment_micros: Math.floor(input.scenario.budget_micros * 0.1), lower_roas_bps: input.outcome === "poor" ? 10000 : 30000 },
      { max_increment_micros: Math.floor(input.scenario.budget_micros * 0.2), lower_roas_bps: input.outcome === "poor" ? 8000 : 25000 },
    ] },
  };
  const provisional = { ...report, source_revision: 1, mature: false, mature_conversions: 0, eligible: 0, qualified: 0 };
  const execute = (suffix, source) => repository.execute({ actor_id, organization_id: trialOrg, key: `${run_id}:${suffix}`, command: { kind: "source_report", payload: source } });
  const first = await execute("provisional", provisional);
  const second = await execute("final", report);
  const select = response => {
    const d = response.state.decisions.find(x => x.id === response.receipt.decision_id);
    return { id: d.id, type: d.type, title: d.title, increment_micros: d.chosen.increment_micros, economics: d.economics, gates: d.gates, qualification: d.learning?.qualification, orchestrator: d.orchestrator ?? "Policy evaluator" };
  };
  const result = { id: run_id, at, input, evidence: stats, before: select(first), after: select(second), source_revision: 2,
    active_outcome_windows: second.state.learning.observations.filter(x => !x.superseded).length,
    source_mode: "fixture", spend_authority: false, network_enrolled: false };
  return repository.execute({ actor_id, organization_id, key, command: { kind: "record_product_demo", payload: { result } }, requestIdentity: identity });
}

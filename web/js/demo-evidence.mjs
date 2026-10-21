/** Explicit synthetic outcomes shared by the demo UI and the trusted demo adapter.
 * These are scenario fixtures, not predictions or evidence from real customers. */
export const DEMO_OUTCOMES = {
  healthy: "Healthy returns",
  poor: "Poor returns & lead quality",
  limited: "Not enough evidence yet",
};
export function demoEvidence({ budget_micros, outcome }) {
  if (!Number.isSafeInteger(budget_micros) || budget_micros < 100e6 || budget_micros > 25000e6)
    throw new Error("Choose a demo budget between $100 and $25,000.");
  if (!Object.hasOwn(DEMO_OUTCOMES, outcome)) throw new Error("Choose a sample outcome.");
  const spend = Math.floor(budget_micros * (outcome === "limited" ? 0.1 : 0.8));
  const assigned = Math.min(5000, Math.floor(spend / 2e6));
  const control = Math.floor(assigned / 2), treatment = assigned - control;
  const controlConversions = Math.round(control * 0.1);
  const treatmentConversions = Math.round(treatment * (outcome === "poor" ? 0.05 : 0.15));
  const purchases = controlConversions + treatmentConversions;
  const revenue = spend * (outcome === "healthy" ? 4 : outcome === "poor" ? 1 : 2);
  return {
    source_mode: "fixture", outcome, spend_micros: spend, net_revenue_micros: revenue,
    platform_fee_micros: Math.floor(spend * 0.05), margin_bps: 5500, fee_bps: 500,
    contribution_micros: Math.floor(revenue * 0.55) - spend - Math.floor(spend * 0.05),
    released_micros: budget_micros - spend, clicks: assigned, purchases,
    eligible: purchases, qualified: Math.round(purchases * (outcome === "poor" ? 0.15 : 0.75)),
    mature: outcome !== "limited", control, treatment, controlConversions, treatmentConversions,
    inference: "descriptive_fixture_only",
  };
}

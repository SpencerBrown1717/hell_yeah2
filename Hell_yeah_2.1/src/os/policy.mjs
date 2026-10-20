import {
  validOrg,
  requireValue,
  policySchema,
  mulBps,
  ratioBps,
  digest,
} from "./contracts.mjs";
import { synthesizeFeedback } from "./feedback.mjs";
export function evaluateGrowth(
  state,
  { at = new Date().toISOString(), runId = "local" } = {},
) {
  requireValue(
    validOrg(state.organization_id),
    "ORGANIZATION_DENIED",
    "Wrong organization.",
    403,
  );
  requireValue(
    state.mode === "fixture" && state.snapshot.source_mode === "fixture",
    "LIVE_ADAPTER_NOT_BOUND",
    "Live economics must come from a certified source adapter.",
    409,
  );
  const p = policySchema.parse(state.policy),
    s = state.snapshot,
    f = synthesizeFeedback(state.feedback);
  const marginKnown =
    Number.isInteger(s.margin_bps) && s.margin_bps > 0 && s.margin_bps <= 10000;
  const contributionBefore = marginKnown
      ? mulBps(s.net_revenue_micros, s.margin_bps)
      : null,
    fees = mulBps(s.spend_micros, s.fee_bps),
    cost = s.spend_micros + fees,
    profit = marginKnown ? contributionBefore - cost : null;
  const economics = {
    spend_micros: s.spend_micros,
    net_revenue_micros: s.net_revenue_micros,
    platform_fee_micros: fees,
    contribution_micros: profit,
    roi_bps: profit === null ? null : ratioBps(profit, cost),
    roas_bps: ratioBps(s.net_revenue_micros, s.spend_micros),
    margin_bps: s.margin_bps,
    fee_bps: s.fee_bps,
    basis: s.attribution,
  };
  const limits = {
    monthly_headroom: Math.max(
      0,
      p.monthly_cap_micros - s.current_budget_micros,
    ),
    wallet: Math.floor(
      (s.wallet_available_micros * 10000) / (10000 + s.fee_bps),
    ),
    cash: Math.floor((p.cash_capacity_micros * 10000) / (10000 + s.fee_bps)),
    inventory: p.inventory_capacity_micros,
    step: mulBps(s.current_budget_micros, p.max_step_bps),
    reinvestment: mulBps(Math.max(0, profit ?? 0), p.reinvest_bps),
  };
  const headroom = Math.min(...Object.values(limits));
  const gates = [
    {
      key: "tracking",
      label: "Verified conversion tracking",
      pass: s.tracker_verified,
    },
    {
      key: "maturity",
      label: "Mature outcome window and sufficient conversions",
      pass: s.mature && s.mature_conversions >= 100,
    },
    {
      key: "freshness",
      label: "Source snapshot within 48 hours",
      pass:
        Number.isFinite(Date.parse(s.at)) &&
        Date.parse(at) - Date.parse(s.at) >= 0 &&
        Date.parse(at) - Date.parse(s.at) <= 48 * 3600 * 1000,
    },
    { key: "margin", label: "Known contribution margin", pass: marginKnown },
    {
      key: "profit",
      label: "Positive customer contribution",
      pass: profit > 0,
    },
    {
      key: "current_roi",
      label: "Current contribution ROI meets your floor",
      pass: economics.roi_bps !== null && economics.roi_bps >= p.min_roi_bps,
    },
    {
      key: "marginal",
      label: "Marginal evidence passes the synthetic validation case",
      pass:
        s.marginal?.certification === "synthetic_passing_case" &&
        Date.parse(s.marginal.expires_at) > Date.parse(at),
    },
    {
      key: "feedback",
      label: "No unresolved material customer concerns",
      pass: f.blocker_ids.length === 0,
    },
    {
      key: "capacity",
      label: "Budget, funds and capacity allow an increase",
      pass: headroom >= 100_000_000,
    },
    {
      key: "customer_intent",
      label: "Customer review cooldown is clear",
      pass:
        !state.cooldown_until ||
        Date.parse(state.cooldown_until) <= Date.parse(at),
    },
    {
      key: "pending_review",
      label: "No unresolved growth draft",
      pass: !state.review_handoffs.some((h) => h.state !== "Withdrawn"),
    },
    {
      key: "learning",
      label: "No measured customer quality deterioration",
      pass: !state.learning?.model?.expansion_veto,
    },
    {
      key: "channel",
      label: "Supported Search model scope",
      pass: s.channel === "Search",
    },
  ];
  const eligible = gates.every((g) => g.pass);
  const candidates = [0, 500, 1000, 1500, 2000].map((step) => {
    const increment = mulBps(s.current_budget_micros, step),
      bound = s.marginal?.bounds?.find(
        (b) => b.max_increment_micros >= increment,
      );
    const lowerRevenue = bound ? mulBps(increment, bound.lower_roas_bps) : 0,
      incrementalCost = increment + mulBps(increment, s.fee_bps),
      lowerContribution = marginKnown
        ? mulBps(lowerRevenue, s.margin_bps) - incrementalCost
        : null,
      roi =
        lowerContribution === null
          ? null
          : ratioBps(lowerContribution, incrementalCost);
    const reasons = [];
    if (step && !eligible) reasons.push("Readiness gate incomplete");
    if (increment > headroom)
      reasons.push("Exceeds customer capacity or reinvestment bound");
    if (step && (!bound || roi === null || roi < p.min_roi_bps))
      reasons.push("Conservative marginal ROI below floor");
    return {
      step_bps: step,
      increment_micros: increment,
      lower_contribution_micros: step ? lowerContribution : 0,
      marginal_roi_bps: step ? roi : null,
      lower_roas_bps: step ? (bound?.lower_roas_bps ?? null) : null,
      eligible: step === 0 || reasons.length === 0,
      reasons,
    };
  });
  const chosen = candidates
    .filter((c) => c.eligible)
    .sort(
      (a, b) =>
        b.lower_contribution_micros - a.lower_contribution_micros ||
        a.increment_micros - b.increment_micros,
    )[0];
  const type = chosen.increment_micros
    ? "bounded_expansion"
    : f.blocker_ids.length
      ? "resolve_feedback"
      : !s.tracker_verified
        ? "repair_tracking"
        : profit <= 0
          ? "repair_economics"
          : "hold_for_evidence";
  const titles = {
    bounded_expansion: "A measured next step is ready to review.",
    resolve_feedback: "Resolve customer concerns before expanding.",
    repair_tracking: "Restore measurement before adding spend.",
    repair_economics: "Improve unit economics before adding spend.",
    hold_for_evidence: "Keep the budget. Build the missing evidence.",
  };
  const inputs = {
    learning: state.learning?.model ?? null,
    cooldown_until: state.cooldown_until,
    review_handoffs: state.review_handoffs,
    policy: p,
    policy_version: state.policy_version,
    snapshot: s,
    feedback: state.feedback.map((x) => ({
      id: x.id,
      status: x.status,
      category: x.category,
      polarity: x.polarity,
      severity: x.severity,
      source: x.source,
    })),
  };
  return {
    id: `decision_${digest({ runId, inputs, at }).slice(0, 24)}`,
    run_id: runId,
    at,
    mode: "fixture",
    type,
    title: titles[type],
    status: "Pending",
    policy_version: state.policy_version,
    input_hash: digest(inputs),
    input_snapshot: structuredClone(inputs),
    economics,
    limits,
    headroom_micros: headroom,
    gates,
    candidates,
    chosen,
    feedback_summary: f,
    source_snapshot_id: s.id,
    source_snapshot_at: s.at,
    source_note:
      "Synthetic economic evidence. No real campaign or Wallet action.",
    objective:
      "Customer contribution first; productive retained ad spend second.",
    valid_until: new Date(
      Math.min(
        Date.parse(at) + 24 * 3600 * 1000,
        Date.parse(s.at) + 48 * 3600 * 1000,
        Date.parse(s.marginal?.expires_at) || Date.parse(at),
      ),
    ).toISOString(),
  };
}

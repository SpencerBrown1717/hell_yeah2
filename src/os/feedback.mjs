import { feedbackSchema, requireValue, digest } from "./contracts.mjs";
export function synthesizeFeedback(feedback) {
  const explicit = feedback.filter((f) => f.source !== "product_action"),
    open = explicit.filter((f) => f.status !== "resolved");
  const blockers = open.filter(
    (f) =>
      f.polarity === "negative" &&
      (f.severity === "high" ||
        ["budget", "inventory", "lead_quality", "brand_fit"].includes(
          f.category,
        )),
  );
  const themes = [...new Set(explicit.map((f) => f.category))].map(
    (category) => ({
      category,
      total: explicit.filter((f) => f.category === category).length,
      open: open.filter((f) => f.category === category).length,
      negative: open.filter(
        (f) => f.category === category && f.polarity === "negative",
      ).length,
    }),
  );
  const actions = feedback.filter((f) => f.source === "product_action");
  return {
    explicit_count: explicit.length,
    open_count: open.length,
    blocker_ids: blockers.map((f) => f.id),
    themes,
    action_count: actions.length,
    accepted: actions.filter((f) => f.action === "approved").length,
    declined: actions.filter((f) => f.action === "dismissed").length,
    effect_claim: null,
  };
}
export function normalizeFeedback(input, context) {
  const p = feedbackSchema.parse(input),
    at = p.occurred_at ?? context.at;
  requireValue(
    Date.parse(at) <= Date.parse(context.at) + 5 * 60 * 1000,
    "FUTURE_EVENT",
    "Feedback cannot be dated in the future.",
  );
  const sourceKey = digest([context.organization_id, p.source, p.external_id]);
  return {
    ...p,
    id: `feedback_${sourceKey.slice(0, 24)}`,
    source_key: sourceKey,
    payload_hash: digest(p),
    organization_id: context.organization_id,
    actor_id: context.actor_id,
    occurred_at: at,
    received_at: context.at,
    status: "open",
    resolution: null,
  };
}

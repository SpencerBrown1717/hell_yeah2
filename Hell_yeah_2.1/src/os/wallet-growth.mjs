import { z } from "zod";
import { digest, requireValue } from "./contracts.mjs";
import { sourceMode } from "./optimization-contracts.mjs";

// Funding interest is a product metric, never evidence of campaign effectiveness.
export function fundingAdvice(state, at) {
  const prefs = state.wallet_growth?.preferences;
  const concern = state.feedback.some(f => f.source !== "product_action" && f.status !== "resolved" && f.polarity === "negative");
  const model = state.optimization?.live?.model;
  const eligible = !!prefs?.prompts_enabled && !concern
    && (!prefs.snoozed_until || Date.parse(prefs.snoozed_until) <= Date.parse(at))
    && Date.parse(model?.valid_until ?? "1970-01-01") > Date.parse(at)
    && model.eligible_strategies > 0;
  return {
    eligible, suggested_amount_cents: null,
    reason: eligible ? "A customer-specific trial supports a draft review. Check available Wallet funds before choosing a top-up."
      : "No proactive funding prompt. Continue learning and resolve customer concerns first.",
    objective: "Customer contribution and experience first; funding is voluntary.",
  };
}
export const checkoutReceipt = z.object({
  intent_id: z.string().min(1).max(100), organization_id: z.string().min(1).max(100),
  source_mode: sourceMode, amount_cents: z.number().int().min(10000).max(10000000),
  currency: z.literal("USD"), session_id: z.string().min(1).max(200),
  livemode: z.boolean(),
  checkout_url: z.url().refine(v => { const u = new URL(v); return u.protocol === "https:" && u.hostname === "checkout.stripe.com" && !u.username && !u.password && !u.port; }, "Use the server-created Stripe Checkout URL."),
  expires_at: z.iso.datetime(), payment_status: z.literal("unpaid"),
}).strict().refine(x => x.livemode === (x.source_mode === "live"), "Stripe test/live mode must match the funding intent.");
export function applyWalletGrowth(state, command, context) {
  state.wallet_growth ??= { preferences: { version: 0, prompts_enabled: false, snoozed_until: null }, intents: [] };
  const wallet = state.wallet_growth, events = [];
  if (command.kind === "wallet_preferences") {
    const p = z.object({ expected_version: z.number().int().min(0), prompts_enabled: z.boolean(), snooze: z.boolean() }).strict().parse(command.payload);
    requireValue(wallet.preferences.version === p.expected_version, "STALE_WALLET_PREFERENCES", "Reload your Wallet preferences first.", 409);
    wallet.preferences = { version: p.expected_version + 1, prompts_enabled: p.prompts_enabled,
      snoozed_until: p.snooze ? new Date(Date.parse(context.at) + 7 * 864e5).toISOString() : null };
    events.push({ type: "wallet.preferences", data: wallet.preferences });
  } else if (command.kind === "wallet_intent") {
    const p = z.object({ source_mode: sourceMode, amount_cents: z.number().int().min(10000).max(10000000), currency: z.literal("USD"), confirmed: z.literal(true) }).strict().parse(command.payload);
    requireValue(wallet.intents.length < 50, "PILOT_RECORD_LIMIT", "Export funding-intent history before extending retention.", 409);
    const intent = { id: "fund_" + digest([context.organization_id, context.operation_id]).slice(0, 24), organization_id: context.organization_id,
      source_mode: p.source_mode, amount_cents: p.amount_cents, currency: p.currency,
      confirmed_by: context.actor_id, created_at: context.at, status: "Awaiting checkout connection", checkout: null,
      stripe_checkout_url: null, charged_cents: 0, credited_cents: 0 };
    wallet.intents.push(intent);
    events.push({ type: "wallet.funding_intent", data: intent });
  } else if (command.kind === "wallet_checkout_receipt") {
    const p = checkoutReceipt.parse(command.payload), intent = wallet.intents.find(i => i.id === p.intent_id);
    requireValue(intent && p.organization_id === context.organization_id && p.amount_cents === intent.amount_cents && p.source_mode === intent.source_mode,
      "CHECKOUT_MISMATCH", "Checkout must match the confirmed organization, mode and amount.", 409);
    requireValue(!intent.checkout || digest(intent.checkout) === digest(p), "SOURCE_EVENT_CONFLICT", "Checkout was already recorded.", 409);
    requireValue(Date.parse(p.expires_at) > Date.parse(context.at), "CHECKOUT_EXPIRED", "Checkout has expired.", 409);
    if (!intent.checkout) {
      intent.checkout = p; intent.stripe_checkout_url = p.checkout_url; intent.status = "Checkout ready — unpaid";
      events.push({ type: "wallet.checkout_prepared", data: { intent_id: intent.id, session_id: p.session_id } });
    }
  } else requireValue(false, "UNKNOWN_COMMAND", "Unknown Wallet command.");
  return { state, events, reevaluate: false };
}

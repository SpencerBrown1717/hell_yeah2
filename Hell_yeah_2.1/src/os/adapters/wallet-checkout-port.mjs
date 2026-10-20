import { requireValue } from "../contracts.mjs";
import { checkoutReceipt } from "../wallet-growth.mjs";

// Delegate to the EXISTING Hellyeah Wallet service. No second money ledger here.
// The dummy URL remains null until this port is bound server-side.
export async function prepareWalletCheckout({ repository, organization_id, intent_id, port }) {
  requireValue(port && typeof port.lookup === "function" && typeof port.createCheckout === "function",
    "CHECKOUT_ADAPTER_NOT_BOUND", "Connect Hellyeah Wallet / Stripe Checkout to enable payment.", 409);
  const { state } = await repository.load(organization_id);
  const intent = state.wallet_growth?.intents.find(i => i.id === intent_id);
  requireValue(intent, "INTENT_NOT_FOUND", "Confirm an amount before creating checkout.", 404);
  if (intent.checkout && Date.parse(intent.checkout.expires_at) > Date.parse(repository.clock())) return intent.checkout;
  requireValue(!intent.checkout, "CHECKOUT_EXPIRED", "Create a new funding intent after reviewing the amount again.", 409);
  const request = { organization_id, intent_id, operation_id: intent_id, source_mode: intent.source_mode,
    amount_cents: intent.amount_cents, currency: intent.currency };
  const receipt = checkoutReceipt.parse(await port.lookup(request) ?? await port.createCheckout(request));
  requireValue(receipt.organization_id === organization_id && receipt.intent_id === intent_id
    && receipt.source_mode === intent.source_mode && receipt.amount_cents === intent.amount_cents,
  "CHECKOUT_MISMATCH", "The checkout session does not match this funding intent.", 409);
  await repository.execute({ organization_id, actor_id: "service:wallet-checkout", key: "checkout:" + intent_id,
    command: { kind: "wallet_checkout_receipt", payload: receipt } });
  return receipt;
}

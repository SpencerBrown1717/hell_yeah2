import test from "node:test";
import assert from "node:assert/strict";
import { sqliteD1 } from "./helpers/sqlite-d1.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { evaluateGrowth } from "../src/os/kernel.mjs";
import { fundingAdvice } from "../src/os/wallet-growth.mjs";
import { prepareWalletCheckout } from "../src/os/adapters/wallet-checkout-port.mjs";
import { handleOS } from "../src/os/http.mjs";

const now = "2026-10-19T00:00:00.000Z";
function setup(t) {
  const db = sqliteD1(); t.after(() => db.close()); let seq = 0;
  const repo = new OSRepository(db, { evaluate: async (s,c) => evaluateGrowth(s, c), clock: () => now });
  const org = "fixture_wallet_growth";
  const command = (kind, payload, key = "wallet-test-" + (++seq)) => repo.execute({ actor_id: "test:owner", organization_id: org, key, command: { kind, payload } });
  const intent = () => command("wallet_intent", { source_mode: "fixture", amount_cents: 50000, currency: "USD", confirmed: true }, "fixed-wallet-intent");
  const state = async () => (await repo.load(org)).state;
  return { db, repo, org, command, intent, state };
}

test("unpaid funding intents persist once and never change the fixture economics or credit money", async t => {
  const h = setup(t), before = await h.state();
  await h.intent(); const replay = await h.intent();
  assert.equal(replay.replayed, true);
  const s = await h.state(); assert.equal(s.wallet_growth.intents.length, 1);
  assert.equal(s.wallet_growth.intents[0].charged_cents, 0); assert.equal(s.wallet_growth.intents[0].credited_cents, 0);
  assert.equal(s.wallet_growth.intents[0].stripe_checkout_url, null);
  assert.deepEqual(s.snapshot, before.snapshot);
  assert.equal(fundingAdvice(s, now).eligible, false);
  await assert.rejects(h.command("wallet_intent", { source_mode: "fixture", amount_cents: 50000, currency: "USD", confirmed: false }));
  await assert.rejects(prepareWalletCheckout({ repository: h.repo, organization_id: h.org, intent_id: s.wallet_growth.intents[0].id }), { code: "CHECKOUT_ADAPTER_NOT_BOUND" });
});

test("live personal evidence and consent are needed for a funding prompt; experience concerns and snooze suppress it", async t => {
  const h = setup(t); await h.command("wallet_preferences", { expected_version: 0, prompts_enabled: true, snooze: false });
  const s = await h.state(), model = { valid_until: "2026-10-20T00:00:00.000Z", eligible_strategies: 1 };
  s.optimization = { fixture: { model } }; assert.equal(fundingAdvice(s, now).eligible, false);
  s.optimization.live = { model }; assert.equal(fundingAdvice(s, now).eligible, true);
  assert.equal(fundingAdvice(s, now).suggested_amount_cents, null);
  s.feedback.push({ id: "concern", source: "customer", category: "experience", polarity: "negative", severity: "low", status: "open" });
  assert.equal(fundingAdvice(s, now).eligible, false);
  s.feedback[0].status = "resolved"; assert.equal(fundingAdvice(s, now).eligible, true);
  await h.command("wallet_preferences", { expected_version: 1, prompts_enabled: true, snooze: true });
  s.wallet_growth = (await h.state()).wallet_growth; assert.equal(fundingAdvice(s, now).eligible, false);
  assert.equal(fundingAdvice(s, "2026-10-27T00:00:00.000Z").eligible, false); // model expired
  await assert.rejects(h.command("wallet_preferences", { expected_version: 1, prompts_enabled: false, snooze: false }), { code: "STALE_WALLET_PREFERENCES" });
});

test("Stripe port recovers lost acknowledgement and validates exact amount without interpreting checkout as paid", async t => {
  const h = setup(t); await h.intent(); const i = (await h.state()).wallet_growth.intents[0];
  let saved = null, calls = 0;
  const port = { lookup: async () => saved, createCheckout: async r => { calls++; saved = {
    intent_id: r.intent_id, organization_id: r.organization_id, source_mode: r.source_mode,
    amount_cents: r.amount_cents, currency: r.currency, session_id: "cs_test_mock", livemode: false,
    checkout_url: "https://checkout.stripe.com/c/pay/cs_test_mock", expires_at: "2026-10-20T00:00:00.000Z", payment_status: "unpaid",
  }; throw new Error("lost checkout acknowledgement"); } };
  const args = { repository: h.repo, organization_id: h.org, intent_id: i.id, port };
  await assert.rejects(prepareWalletCheckout(args), /lost checkout/);
  const receipt = await prepareWalletCheckout(args); assert.equal(receipt.payment_status, "unpaid"); assert.equal(calls, 1);
  assert.deepEqual(await prepareWalletCheckout(args), receipt); assert.equal(calls, 1);
  assert.equal((await h.state()).wallet_growth.intents[0].credited_cents, 0);
  const response = await handleOS(new Request("https://os.test/api/os", { method: "POST", headers: {
    "content-type": "application/json", "x-hy-service-key": "fixture-service-key-for-wallet-32-chars", "x-hy-workspace": h.org, "idempotency-key": "checkout-http-repeat",
  }, body: JSON.stringify({ kind: "wallet_prepare_checkout", payload: { intent_id: i.id } }) }), { repository: h.repo, serviceKey: "fixture-service-key-for-wallet-32-chars", checkoutPort: port });
  assert.equal(response.status, 200);
  const rendered = await response.json(); assert.equal(rendered.integration_ports.wallet_checkout, true);
  assert.equal(rendered.state.wallet_growth.intents[0].checkout.session_id, "cs_test_mock"); assert.equal(calls, 1);
  await h.command("wallet_intent", { source_mode: "fixture", amount_cents: 10000, currency: "USD", confirmed: true });
  const next = (await h.state()).wallet_growth.intents[1];
  await assert.rejects(prepareWalletCheckout({ ...args, intent_id: next.id }), { code: "CHECKOUT_MISMATCH" });
  await assert.rejects(h.command("wallet_checkout_receipt", { ...receipt, checkout_url: "https://checkout.stripe.com.evil.test/" }));
  await assert.rejects(h.command("wallet_checkout_receipt", { ...receipt, payment_status: "paid" }));
  await assert.rejects(h.command("wallet_checkout_receipt", { ...receipt, livemode: true }));
});

test("browser cannot forge a checkout receipt or payment success", async t => {
  const h = setup(t);
  const r = await handleOS(new Request("https://os.test/api/os", { method: "POST", headers: {
    origin: "https://os.test", "content-type": "application/json", "oai-authenticated-user-id": "wallet-owner", "idempotency-key": "fake-checkout-receipt",
  }, body: JSON.stringify({ kind: "wallet_checkout_receipt", payload: {} }) }), { repository: h.repo });
  assert.equal(r.status, 403); assert.equal((await r.json()).error, "SOURCE_AUTHORITY");
});

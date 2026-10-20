import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hash, clone, readiness, research, simulate, createPlan, approve, FixtureHellyeahAdapter, runGrowthCycle, ensureMode, assign, analyzeOwnedOutcomes } from '../src/domain.mjs';

const base = JSON.parse(readFileSync(new URL('../fixtures/scenario.json', import.meta.url), 'utf8'));
function prepared() {
  const f = clone(base), p = createPlan(f, research(f), simulate(f, { draws: 100 }));
  return { f, p, g: approve(f, p), adapter: new FixtureHellyeahAdapter(f) };
}
const error = code => e => e.code === code;

test('all four module stages complete with explicit fixture limits and one reservation', () => {
  const r = runGrowthCycle(base);
  assert.equal(r.stages.length, 10);
  assert.equal(r.mode, 'fixture'); assert.equal(r.live_integrations_verified, false);
  assert.equal(r.operation.state, 'Serving');
  assert.equal(r.wallet.available_micros, 300000000);
  assert.equal(r.wallet.reserved_micros, 200000000);
  assert.equal(r.result.verdict, 'inconclusive');
  assert.equal(r.forecast.calibrated, false);
});
test('conversion submission requires verified active X-Ray', () => {
  const { f, p, g } = prepared(); f.tracker.enabled = false;
  assert.throws(() => new FixtureHellyeahAdapter(f).submit(p, g, 'k'), error('XRAY_NOT_VERIFIED'));
});
test('a collector acknowledgment cannot substitute for an internal verified event', () => {
  const f = clone(base); f.tracker.verified_internal_event = false;
  assert.ok(readiness(f).errors.includes('XRAY_NOT_VERIFIED'));
});
test('impression readiness works without X-Ray', () => {
  const f = clone(base); f.campaign.goal = 'impressions'; f.tracker.enabled = false;
  assert.equal(readiness(f).ready, true);
});
test('Search does not wait for unrelated image rendering; PMax requires final variants', () => {
  assert.equal(readiness(base).ready, true);
  const f = clone(base); f.campaign.channel = 'pmax';
  assert.ok(readiness(f).errors.includes('PMAX_SELECTION_MISSING'));
});
test('incomplete brand cannot submit', () => {
  const { f, p, g } = prepared(); f.brand.complete = false;
  assert.throws(() => new FixtureHellyeahAdapter(f).submit(p, g, 'k'), error('BRAND_INCOMPLETE'));
});
test('retry after accepted-but-lost response reconciles same source operation', () => {
  const { adapter, p, g } = prepared();
  adapter.submit(p, g, 'k'); // Emulate a source acceptance followed by transport loss.
  const readback = adapter.readOperation('k');
  const retry = adapter.submit(p, g, 'k');
  assert.equal(retry.id, readback.id); assert.equal(adapter.operations.size, 1);
  assert.equal(adapter.fixture.wallet.reserved_micros, 200000000);
});
test('reusing an idempotency key with a changed plan conflicts', () => {
  const { adapter, p, g, f } = prepared(); adapter.submit(p, g, 'k');
  const revised = clone(p); revised.hypothesis_id = 'fixture_other';
  assert.throws(() => adapter.submit(revised, approve(f, revised), 'k'), error('IDEMPOTENCY_CONFLICT'));
});
test('a different key cannot reserve an already submitted campaign again', () => {
  const { adapter, p, g } = prepared(); adapter.submit(p, g, 'one');
  assert.throws(() => adapter.submit(p, g, 'two'), error('SOURCE_STATE_CONFLICT'));
});
test('changed plan invalidates approval hash', () => {
  const { adapter, p, g } = prepared(); p.campaign.maximum_spend_micros -= 100;
  assert.throws(() => adapter.submit(p, g, 'k'), error('APPROVAL_HASH_MISMATCH'));
});
test('expired, malformed and revoked grants fail closed', () => {
  for (const expiry of ['2026-10-17T00:00:00Z', 'invalid']) {
    const { adapter, p, g } = prepared(); g.expires_at = expiry;
    assert.throws(() => adapter.submit(p, g, 'k'), error('APPROVAL_EXPIRED'));
  }
  const { adapter, p, g } = prepared(); g.revoked = true;
  assert.throws(() => adapter.submit(p, g, 'k'), error('APPROVAL_REVOKED'));
});
test('wrong organization and unauthorized approver fail closed', () => {
  const { adapter, p, g } = prepared(); p.organization_id = 'fixture_other_org';
  assert.throws(() => adapter.submit(p, g, 'k'), error('ORGANIZATION_MISMATCH'));
  const f = clone(base); f.actor.capabilities = ['view_evidence'];
  assert.throws(() => approve(f, createPlan(f, research(f), simulate(f, { draws: 100 }))), error('CAPABILITY_DENIED'));
});
test('an approval cannot expand its spending envelope', () => {
  const { adapter, p, g } = prepared(); g.maximum_spend_micros = 1;
  assert.throws(() => adapter.submit(p, g, 'k'), error('ENVELOPE_EXCEEDED'));
});
test('a plan cannot redirect a source operation to another managed account', () => {
  const { adapter, p, f } = prepared(); p.campaign.managed_account_id = 'fixture_other_account';
  assert.throws(() => adapter.submit(p, approve(f, p), 'k'), error('MANAGED_ACCOUNT_SCOPE'));
});
test('a plan cannot redirect a source operation to another campaign', () => {
  const { adapter, p, f } = prepared(); p.campaign.id = 'fixture_other_campaign';
  assert.throws(() => adapter.submit(p, approve(f, p), 'k'), error('CAMPAIGN_SCOPE'));
});
test('pending refunds are not available funds', () => {
  const { f, p, g } = prepared(); f.wallet.available_micros = 1; f.wallet.pending_refund_micros = 900000000;
  assert.throws(() => new FixtureHellyeahAdapter(f).submit(p, g, 'k'), error('INSUFFICIENT_AVAILABLE_FUNDS'));
});
test('a new keyword plan requires source repricing', () => {
  const { f, p, adapter } = prepared(); p.campaign.keyword_plan_version = 'fixture_unpriced';
  assert.throws(() => adapter.submit(p, approve(f, p), 'k'), error('KEYWORDS_REQUIRE_REPRICING'));
});
test('a Studio edit makes the source version stale', () => {
  const { f, p, g } = prepared(); f.studio.version = '2';
  assert.throws(() => new FixtureHellyeahAdapter(f).submit(p, g, 'k'), error('STALE_SOURCE_VERSION'));
});
test('kill switch blocks new submission without touching funds', () => {
  const { adapter, p, g } = prepared(); adapter.killSwitch = true;
  assert.throws(() => adapter.submit(p, g, 'k'), error('KILL_SWITCH'));
  assert.equal(adapter.fixture.wallet.available_micros, 500000000);
});
test('unbound live mode and fixture/live mixing are rejected', () => {
  assert.throws(() => ensureMode('live'), error('LIVE_ADAPTER_NOT_BOUND'));
  const { adapter, p, g } = prepared(); g.mode = 'live';
  assert.throws(() => adapter.submit(p, g, 'k'), error('MODE_MISMATCH'));
});
test('same seed and snapshot reproduce uncalibrated simulation', () => {
  assert.deepEqual(simulate(base, { seed: 7, draws: 100 }), simulate(base, { seed: 7, draws: 100 }));
});
test('zero conversions produce null historical CPA without division by zero', () => {
  const f = clone(base); f.snapshot.conversions = 0;
  const out = simulate(f, { draws: 100 });
  assert.equal(out.historical_cpa_micros, null); assert.equal(out.zero_conversion_probability, 1);
});
test('fractional outcomes and immature history are not silently treated as integer truth', () => {
  const f = clone(base); f.snapshot.conversions = 1.2;
  assert.throws(() => simulate(f), error('UNSUPPORTED_CONVERSION_MEASUREMENT'));
  f.snapshot.conversions = 40; f.snapshot.mature = false;
  assert.throws(() => simulate(f), error('OUTCOMES_IMMATURE'));
});
test('missing evidence cannot create a factual creative finding', () => {
  const f = clone(base); f.capture.text = 'unrelated text';
  assert.throws(() => research(f), error('SOURCE_MISMATCH'));
});
test('native aggregate campaign outcomes cannot use the owned-assignment analysis', () => {
  const outcomes = clone(base.outcomes); outcomes.source = 'google_daily_totals';
  assert.throws(() => analyzeOwnedOutcomes(outcomes), error('UNSUPPORTED_ASSIGNMENT_SOURCE'));
});
test('descriptive fixture does not fabricate a significant winner', () => {
  const out = analyzeOwnedOutcomes(base.outcomes);
  assert.ok(Math.abs(out.absolute_difference - 0.025) < 1e-12);
  assert.equal(out.verdict, 'inconclusive'); assert.match(out.inference, /Descriptive/);
});
test('assignment is stable and has roughly equal allocation in a large fixed fixture', () => {
  const secret = 'fixture_only_secret_do_not_use_live';
  assert.equal(assign('o', 'e', 'u', secret), assign('o', 'e', 'u', secret));
  let count = 0;
  for (let i = 0; i < 10000; i++) if (assign('o', 'e', String(i), secret) === 'treatment') count++;
  assert.ok(count > 4800 && count < 5200);
});
test('canonical plan hashes ignore object key order', () => {
  assert.equal(hash({ b: 2, a: 1 }), hash({ a: 1, b: 2 }));
});

import { createHash, createHmac } from 'node:crypto';

export class DomainError extends Error {
  constructor(code, message = code) { super(message); this.code = code; }
}
export const check = (condition, code) => { if (!condition) throw new DomainError(code); };
export const canonical = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
};
export const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
export const clone = value => structuredClone(value);
const money = v => Number.isSafeInteger(v) && v >= 0;

export function ensureMode(mode = process.env.HY_ADAPTER_MODE ?? 'fixture') {
  check(mode === 'fixture', 'LIVE_ADAPTER_NOT_BOUND');
  return mode;
}
export function authorize(ctx, organizationId, capability) {
  check(ctx.organization_id === organizationId, 'ORGANIZATION_MISMATCH');
  check(ctx.actor.capabilities.includes(capability), 'CAPABILITY_DENIED');
}
export function readiness(fixture, plan = fixture.campaign) {
  const errors = [];
  if (!fixture.brand.complete) errors.push('BRAND_INCOMPLETE');
  if (!fixture.studio.copy_ready) errors.push('COPY_NOT_READY');
  if (plan.channel === 'pmax' && (!fixture.studio.landscape_selected || !fixture.studio.square_selected)) errors.push('PMAX_SELECTION_MISSING');
  if (plan.goal === 'conversions' && !(fixture.tracker.enabled && fixture.tracker.receiving_events && fixture.tracker.verified_internal_event)) errors.push('XRAY_NOT_VERIFIED');
  if (!plan.managed_account_id?.startsWith('fixture_')) errors.push('MANAGED_ACCOUNT_REQUIRED');
  if (!money(plan.maximum_spend_micros) || plan.maximum_spend_micros === 0) errors.push('INVALID_MAXIMUM');
  if (plan.currency !== fixture.wallet.currency) errors.push('CURRENCY_MISMATCH');
  if (plan.maximum_spend_micros > fixture.wallet.available_micros) errors.push('INSUFFICIENT_AVAILABLE_FUNDS');
  return { ready: errors.length === 0, errors };
}
export function research(fixture) {
  check(fixture.capture.complete && fixture.capture.owned, 'EVIDENCE_INCOMPLETE');
  const observation = {
    schema_version: '1', organization_id: fixture.organization_id,
    artifact_id: fixture.capture.id, creative_set_id: fixture.studio.id,
    creative_version: fixture.studio.version, value: fixture.studio.headline,
    region: fixture.studio.source_region, evidence_grade: 'observed_only',
  };
  check(fixture.capture.text.includes(observation.value), 'SOURCE_MISMATCH');
  return {
    id: `fixture_hypothesis_${hash(observation).slice(0, 12)}`,
    organization_id: fixture.organization_id, observation,
    proposed_change: 'Test a message-matched landing-page CTA',
    primary_metric: 'qualified_lead_per_assigned_visitor',
    effect_claim: null,
  };
}
function rng(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}
function quantile(sorted, q) { return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]; }
export function simulate(fixture, { seed = 17, draws = 2000 } = {}) {
  const s = fixture.snapshot;
  check(s.currency === fixture.campaign.currency, 'CURRENCY_MISMATCH');
  check(s.mature, 'OUTCOMES_IMMATURE');
  check(s.clicks > 0 && money(s.cost_micros) && s.cost_micros > 0, 'INSUFFICIENT_HISTORY');
  check(Number.isInteger(s.conversions) && s.conversions >= 0 && s.conversions <= s.clicks, 'UNSUPPORTED_CONVERSION_MEASUREMENT');
  check(Number.isInteger(draws) && draws >= 100 && draws <= 10000, 'DRAW_LIMIT');
  const random = rng(seed), rate = s.conversions / s.clicks;
  const plannedClicks = Math.min(100000, Math.round(fixture.campaign.maximum_spend_micros / (s.cost_micros / s.clicks)));
  const counts = Array.from({ length: draws }, () => {
    let count = 0;
    for (let i = 0; i < plannedClicks; i++) if (random() < rate) count++;
    return count;
  }).sort((a, b) => a - b);
  return {
    id: `fixture_forecast_${hash({ s, campaign: fixture.campaign, seed, draws }).slice(0, 12)}`,
    schema_version: '1', organization_id: fixture.organization_id,
    fidelity_level: 'planning', calibrated: false,
    method: 'Fixed historical CPC/CVR assumption; binomial outcome fixture, no parameter or response-model uncertainty',
    snapshot_id: s.id, seed, draws, expected_conversions: counts.reduce((a,b) => a+b,0)/draws,
    conversion_interval_80: [quantile(counts, 0.1), quantile(counts, 0.9)],
    zero_conversion_probability: counts.filter(v => v === 0).length / draws,
    historical_cpa_micros: s.conversions ? s.cost_micros / s.conversions : null,
    numerical_effect_assumption: 'No treatment uplift assumed; insufficient evidence for causal claims',
  };
}
export function createPlan(fixture, hypothesis, forecast) {
  check(hypothesis.organization_id === fixture.organization_id && forecast.organization_id === fixture.organization_id, 'ORGANIZATION_MISMATCH');
  return {
    schema_version: '1', mode: 'fixture', organization_id: fixture.organization_id,
    campaign: clone(fixture.campaign), brand_version: fixture.brand.version,
    creative_version: fixture.studio.version, hypothesis_id: hypothesis.id, forecast_id: forecast.id,
    analysis: 'fixed_horizon_owned_assignment', primary_metric: hypothesis.primary_metric,
    maturity_required: true, experiment_type: 'owned_landing_page',
  };
}
export function approve(fixture, plan) {
  authorize(fixture, plan.organization_id, 'approve_launch');
  return {
    mode: 'fixture', organization_id: fixture.organization_id,
    campaign_id: plan.campaign.id, plan_hash: hash(plan),
    maximum_spend_micros: plan.campaign.maximum_spend_micros,
    allowed_operations: ['submit'], expires_at: '2026-10-19T00:00:00Z',
    actor_id: fixture.actor.id, revoked: false,
  };
}

/** In-memory emulator of the authoritative source transaction. Not production durability. */
export class FixtureHellyeahAdapter {
  constructor(fixture) {
    ensureMode(fixture.mode);
    this.fixture = clone(fixture); this.operations = new Map(); this.killSwitch = false;
  }
  submit(plan, grant, key) {
    const f = this.fixture;
    authorize(f, plan.organization_id, 'approve_launch');
    check(plan.campaign.id === f.campaign.id, 'CAMPAIGN_SCOPE');
    check(plan.campaign.managed_account_id === f.campaign.managed_account_id, 'MANAGED_ACCOUNT_SCOPE');
    check(!this.killSwitch, 'KILL_SWITCH');
    check(plan.mode === 'fixture' && grant.mode === 'fixture', 'MODE_MISMATCH');
    check(!grant.revoked, 'APPROVAL_REVOKED');
    check(Number.isFinite(Date.parse(grant.expires_at)) && Date.parse(grant.expires_at) > Date.parse(f.clock), 'APPROVAL_EXPIRED');
    check(grant.organization_id === f.organization_id && grant.campaign_id === plan.campaign.id, 'APPROVAL_SCOPE');
    check(grant.plan_hash === hash(plan), 'APPROVAL_HASH_MISMATCH');
    check(grant.allowed_operations.includes('submit'), 'OPERATION_DENIED');
    check(plan.campaign.maximum_spend_micros <= grant.maximum_spend_micros, 'ENVELOPE_EXCEEDED');
    check(plan.campaign.keyword_plan_version === f.campaign.keyword_plan_version, 'KEYWORDS_REQUIRE_REPRICING');
    check(plan.creative_version === f.studio.version && plan.brand_version === f.brand.version && plan.campaign.version === f.campaign.version, 'STALE_SOURCE_VERSION');
    const digest = hash(plan);
    if (this.operations.has(key)) {
      const prior = this.operations.get(key);
      check(prior.plan_hash === digest, 'IDEMPOTENCY_CONFLICT'); return clone(prior);
    }
    check(f.campaign.state === 'Draft', 'SOURCE_STATE_CONFLICT');
    const valid = readiness(f, plan.campaign); check(valid.ready, valid.errors[0]);
    f.wallet.available_micros -= plan.campaign.maximum_spend_micros;
    f.wallet.reserved_micros += plan.campaign.maximum_spend_micros;
    f.campaign.state = 'In Review';
    const operation = { id: `fixture_operation_${this.operations.size + 1}`, plan_hash: digest, reservation_id: `fixture_reservation_${this.operations.size + 1}`, state: 'In Review' };
    this.operations.set(key, operation); return clone(operation);
  }
  reviewAndServe(key) {
    const op = this.operations.get(key); check(op, 'OPERATION_NOT_FOUND');
    check(op.state === 'In Review', 'SOURCE_STATE_CONFLICT');
    op.state = 'Serving'; this.fixture.campaign.state = 'Serving';
    return clone(op);
  }
  readOperation(key) { return clone(this.operations.get(key) ?? null); }
}
export function analyzeOwnedOutcomes(outcomes) {
  check(outcomes.mature, 'OUTCOMES_IMMATURE');
  check(outcomes.source === 'owned_assignment_fixture', 'UNSUPPORTED_ASSIGNMENT_SOURCE');
  for (const arm of [outcomes.control, outcomes.treatment]) {
    check(Number.isInteger(arm.assigned) && arm.assigned > 0 && Number.isInteger(arm.conversions) && arm.conversions >= 0 && arm.conversions <= arm.assigned, 'INVALID_OUTCOMES');
  }
  const control = outcomes.control.conversions / outcomes.control.assigned;
  const treatment = outcomes.treatment.conversions / outcomes.treatment.assigned;
  return { control_rate: control, treatment_rate: treatment, absolute_difference: treatment - control,
    verdict: 'inconclusive', inference: 'Descriptive fixture only; no certified significance test implemented', calibrated: false };
}
export function assign(organizationId, experimentId, unitId, secret) {
  check(typeof secret === 'string' && secret.length >= 16, 'ASSIGNMENT_SECRET_REQUIRED');
  const digest = createHmac('sha256', secret).update(canonical([organizationId, experimentId, unitId])).digest();
  return digest.readUInt32BE(0) < 0x80000000 ? 'control' : 'treatment';
}
export function runGrowthCycle(input) {
  const fixture = clone(input); ensureMode(process.env.HY_ADAPTER_MODE ?? fixture.mode);
  const hypothesis = research(fixture), forecast = simulate(fixture);
  const plan = createPlan(fixture, hypothesis, forecast), grant = approve(fixture, plan);
  const adapter = new FixtureHellyeahAdapter(fixture), key = 'fixture_launch_1';
  const submitted = adapter.submit(plan, grant, key), retried = adapter.submit(plan, grant, key);
  check(submitted.id === retried.id, 'DUPLICATE_SUBMISSION');
  const serving = adapter.reviewAndServe(key), result = analyzeOwnedOutcomes(fixture.outcomes);
  return {
    mode: 'fixture', live_integrations_verified: false, organization_id: fixture.organization_id,
    stages: ['brand_context', 'creative_evidence', 'simulation', 'experiment_plan', 'scoped_approval', 'wallet_reservation', 'source_review', 'serving', 'mature_outcomes', 'next_decision'],
    hypothesis, forecast, plan_hash: hash(plan), operation: serving, wallet: adapter.fixture.wallet, result,
    decision: 'Keep incumbent; insufficient inferential evidence to promote a treatment',
    limitations: ['In-memory source emulator', 'No external services or LLM calls', 'Assumption simulator is uncalibrated', 'Outcome comparison is descriptive'],
  };
}

import { reportSchema } from './adapters/report-contract.mjs';
import { feedbackSchema } from './contracts.mjs';

export const CUSTOMER_DATASET_ID = 'synthetic-customers-100-v1';
export const CUSTOMER_CLOCKS = {
  baseline: '2026-10-04T00:00:00.000Z',
  updated: '2026-10-18T00:00:00.000Z',
};
export const CUSTOMER_SCENARIOS = [
  'growth_recovery', 'steady_growth', 'quality_drop', 'revenue_drop',
  'tracking_gap', 'immature_window', 'unknown_margin', 'empty_wallet',
  'customer_concern', 'unvalidated_marginal',
];
export const CASE_CONTEXT = [
  { name: 'Marvel Snap', metric: 'Published first-quarter ROAS: 3.6x', url: 'https://www.hellyeahai.com/case-studies/marvel-snap-game-marketing-strategy' },
  { name: 'Heroes of Mavia', metric: 'Published ROI improvement: 71%', url: 'https://www.hellyeahai.com/case-studies/heroes-of-mavia-game-launch-strategy' },
  { name: 'Truist', metric: 'Published CAC: $450 to $200', url: 'https://www.hellyeahai.com/case-studies/truist-app-growth-strategy' },
];

/** Fully invented businesses. Public case highlights are context, never customer observations. */
export function makeCustomerDataset() {
  const industries = ['Home services', 'Fitness', 'Local retail', 'Education', 'B2B services'];
  const prefixes = ['Amber', 'Cedar', 'Northstar', 'Harbor', 'Juniper', 'Maple', 'Orbit', 'Summit', 'Willow', 'Zephyr'];
  const customers = Array.from({ length: 100 }, (_, i) => {
    const number = String(i + 1).padStart(3, '0');
    const scenario = CUSTOMER_SCENARIOS[Math.floor(i / 10)];
    const spend = 3500 + ((i * 173) % 10500);
    const initialEligible = 120 + i % 20;
    const eligible = 600 + i % 100;
    return {
      customer_id: `SYN-${number}`,
      business_name: `${prefixes[Math.floor(i / 10)]} ${industries[i % 5]} ${number} (Synthetic)`,
      email: `customer-${number}@example.com`,
      industry: industries[i % 5],
      organization_id: `fixture_dataset_${number}`,
      managed_account_id: `fixture_account_${number}`,
      scenario,
      aggregate_opt_in: i % 5 !== 0,
      initial_spend_usd: spend,
      initial_revenue_usd: Math.round(spend * (scenario === 'growth_recovery' ? 1.2 : 3.6)),
      initial_eligible: initialEligible,
      initial_qualified: Math.round(initialEligible * (scenario === 'growth_recovery' ? 0.15 : 0.70)),
      spend_usd: spend,
      net_revenue_usd: Math.round(spend * (scenario === 'revenue_drop' ? 1.2 : 3.6 + (i % 4) * 0.15)),
      eligible,
      qualified: Math.round(eligible * (scenario === 'quality_drop' ? 0.08 : 0.72 + (i % 4) * 0.02)),
      margin_bps: scenario === 'unknown_margin' ? null : 5500,
      fee_bps: 500,
      mature: scenario !== 'immature_window',
      tracker_verified: scenario !== 'tracking_gap',
      current_budget_usd: spend * 2,
      wallet_available_usd: scenario === 'empty_wallet' ? 0 : spend,
      marginal_certification: scenario === 'unvalidated_marginal' ? 'unvalidated' : 'synthetic_passing_case',
      feedback: {
        source: 'manual_import', external_id: `synthetic-feedback-${number}`,
        category: scenario === 'customer_concern' ? 'budget' : 'experience',
        polarity: scenario === 'customer_concern' ? 'negative' : 'neutral',
        severity: scenario === 'customer_concern' ? 'high' : 'low',
        text: scenario === 'customer_concern'
          ? 'SYNTHETIC: cash is tight; do not increase my advertising budget.'
          : 'SYNTHETIC: reviewing the new report; no additional spending consent.',
        campaign_id: null, action: null, occurred_at: CUSTOMER_CLOCKS.updated,
      },
    };
  });
  return {
    dataset_id: CUSTOMER_DATASET_ID, synthetic: true, evidence_mode: 'fixture',
    source_checked_at: '2026-10-19', case_context: CASE_CONTEXT,
    disclosure: 'Every business, contact, event, financial value and outcome is invented. Team case studies supply illustrative context only. All reports use the supported Search/USD test port; these are not reproductions of multi-channel game/app campaigns. The 5% fee, 55% margin and marginal bounds are test assumptions, not Hellyeah pricing or calibrated forecasts.',
    customers,
  };
}

export function reportForCustomer(row, stage) {
  if (!['baseline', 'updated'].includes(stage)) throw new Error('Unknown fixture stage');
  const baseline = stage === 'baseline';
  const at = CUSTOMER_CLOCKS[stage];
  return reportSchema.parse({
    source: 'fixture_hellyeah_google', source_mode: 'fixture',
    organization_id: row.organization_id, managed_account_id: row.managed_account_id,
    scope: 'managed_account_rollup', campaign_ids: [`${row.customer_id}-search`],
    source_revision: 1,
    period_start: baseline ? '2026-09-19T00:00:00.000Z' : '2026-10-03T00:00:00.000Z',
    period_end: baseline ? '2026-10-03T00:00:00.000Z' : '2026-10-17T00:00:00.000Z',
    observed_at: at, currency: 'USD', channel: 'Search',
    spend_micros: Math.round((baseline ? row.initial_spend_usd : row.spend_usd) * 1e6),
    net_revenue_micros: Math.round((baseline ? row.initial_revenue_usd : row.net_revenue_usd) * 1e6),
    margin_bps: baseline ? 5500 : row.margin_bps, fee_bps: row.fee_bps,
    mature: baseline || row.mature,
    mature_conversions: baseline ? row.initial_eligible : row.mature ? row.eligible : 0,
    tracker_verified: baseline || row.tracker_verified,
    current_budget_micros: Math.round(row.current_budget_usd * 1e6),
    wallet_available_micros: Math.round((baseline ? row.spend_usd : row.wallet_available_usd) * 1e6),
    eligible: baseline ? row.initial_eligible : row.eligible,
    qualified: baseline ? row.initial_qualified : row.qualified,
    marginal: {
      certification: baseline ? 'synthetic_passing_case' : row.marginal_certification,
      expires_at: new Date(Date.parse(at) + 864e5).toISOString(),
      bounds: [{ max_increment_micros: 20_000_000_000, lower_roas_bps: 32000 }],
    },
  });
}

export function validateCustomerDataset(dataset) {
  if (dataset.synthetic !== true || dataset.dataset_id !== CUSTOMER_DATASET_ID || dataset.customers?.length !== 100)
    throw new Error('Expected the explicitly synthetic, 100-customer fixture dataset');
  const ids = new Set(), accounts = new Set(), customers = new Set();
  for (const row of dataset.customers) {
    if (!/^fixture_dataset_\d{3}$/.test(row.organization_id) || ids.has(row.organization_id)
      || !/^SYN-\d{3}$/.test(row.customer_id) || customers.has(row.customer_id)
      || accounts.has(row.managed_account_id) || typeof row.aggregate_opt_in !== 'boolean')
      throw new Error('Fixture identities must be unique and isolated');
    ids.add(row.organization_id); accounts.add(row.managed_account_id); customers.add(row.customer_id);
    for (const key of ['initial_spend_usd', 'initial_revenue_usd', 'spend_usd', 'net_revenue_usd', 'current_budget_usd', 'wallet_available_usd']) {
      const value = row[key];
      if (!Number.isFinite(value) || value < 0 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)
        throw new Error(`${key} must be non-negative USD with cent precision`);
    }
    reportForCustomer(row, 'baseline'); reportForCustomer(row, 'updated');
    feedbackSchema.parse(row.feedback);
  }
  return dataset;
}

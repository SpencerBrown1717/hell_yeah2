import { digest } from "../contracts.mjs";
export const optimizationFixtureConfig = (overrides = {}) => ({ source_mode: "fixture", enabled: true, share_learning: true,
  industry: "home_services", country: "US", channel: "Search", currency: "USD", metric: "qualified_conversion_v1", min_roi_bps: 2000, ...overrides });
export function mockTrial(organization_id, overrides = {}) {
  return { source_mode: "fixture", organization_id, trial_id: "trial_first", strategy_id: "creative_proof",
    registered_at: "2026-10-01T00:00:00.000Z", starts_at: "2026-10-02T00:00:00.000Z", ends_at: "2026-10-09T00:00:00.000Z", mature_after: "2026-10-10T00:00:00.000Z",
    target_per_arm: 10000, randomization_unit: "independent_customer", allocation_bps: 5000, contribution_bound_usd: 10,
    campaign_id: "fixture_campaign", managed_account_id: "fixture_managed_account", brand_version: 1, creative_version: 2,
    control_hash: digest("fixture_control"), candidate_hash: digest("fixture_candidate"), existing_budget_micros: 1000000000, ...overrides };
}
export function mockTrialReport(design, overrides = {}) {
  return { source_mode: design.source_mode, organization_id: design.organization_id, trial_id: design.trial_id, design_hash: digest(design),
    source_revision: 1, observed_at: design.mature_after, finalized: true, assignment_verified: true, bounds_verified: true, tracker_verified: true, guardrail_violation: false,
    control: { units: 10000, qualified: 2000, contribution_sum_usd: 10000, acquisition_cost_usd: 10000 },
    candidate: { units: 10000, qualified: 7000, contribution_sum_usd: 60000, acquisition_cost_usd: 10000 }, ...overrides };
}
export function mockDraftPort() {
  const saved = new Map();
  return { calls: 0, lostAcknowledgement: false,
    async lookup(r) { return saved.get(`${r.organization_id}:${r.operation_id}`) ?? null; },
    async prepareDraft(r) {
      this.calls++;
      const receipt = { source_mode: r.source_mode, organization_id: r.organization_id, proposal_id: r.proposal_id, operation_id: r.operation_id,
        draft_id: "mock_draft_" + r.operation_id, status: "Draft", plan_hash: r.plan_hash, reserved_micros: 0, launched: false };
      saved.set(`${r.organization_id}:${r.operation_id}`, receipt);
      if (this.lostAcknowledgement) { this.lostAcknowledgement = false; throw new Error("Mock acknowledgement lost"); }
      return receipt;
    },
  };
}

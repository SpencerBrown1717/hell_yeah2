import scenario from "../../../fixtures/scenario.json" with { type: "json" };
import {
  FixtureHellyeahAdapter,
  research,
  simulate,
  createPlan,
  approve,
  analyzeOwnedOutcomes,
  assign,
} from "../../domain.mjs";
import { sampleSnapshot } from "../kernel.mjs";
import { requireValue } from "../contracts.mjs";

/** A mock managed Google campaign through Hellyeah's source-owned lifecycle. No network calls. */
export class MockGoogleCampaign {
  constructor({ organization_id, at }) {
    this.at = at;
    const fixture = structuredClone(scenario);
    fixture.organization_id = organization_id;
    fixture.clock = at;
    fixture.wallet.available_micros = 100_000_000_000;
    fixture.campaign.maximum_spend_micros = 20_000_000_000;
    this.source = new FixtureHellyeahAdapter(fixture);
    this.hypothesis = research(fixture);
    this.forecast = simulate(fixture, { draws: 100 });
    this.plan = createPlan(fixture, this.hypothesis, this.forecast);
    this.experiment = {
      type: this.plan.experiment_type,
      metric: this.plan.primary_metric,
      source: fixture.outcomes.source,
      assignment_repeatable:
        assign(
          organization_id,
          "mock-experiment",
          "mock-visitor",
          "fixture-assignment-secret-32chars",
        ) ===
        assign(
          organization_id,
          "mock-experiment",
          "mock-visitor",
          "fixture-assignment-secret-32chars",
        ),
      analysis: analyzeOwnedOutcomes(fixture.outcomes),
    };
    this.grant = approve(fixture, this.plan);
    this.grant.expires_at = new Date(Date.parse(at) + 864e5).toISOString();
    this.events = [];
  }
  submit(key) {
    const prior = this.source.readOperation(key),
      op = this.source.submit(this.plan, this.grant, key);
    if (!prior)
      this.events.push({
        state: op.state,
        action: "Reserve maximum once; await Hellyeah review",
      });
    return op;
  }
  serve(key) {
    const op = this.source.reviewAndServe(key);
    this.events.push({
      state: op.state,
      action: "Source review passed; mock managed Google campaign serving",
    });
    return op;
  }
  report({ revision = 1, quality = "healthy" } = {}) {
    requireValue(
      this.source.fixture.campaign.state === "Serving",
      "CAMPAIGN_NOT_SERVING",
      "No report before review and serving.",
    );
    const p = sampleSnapshot("scale_ready", this.at),
      f = this.source.fixture;
    const spend = 18_462_000_000,
      delta = spend - f.wallet.spent_micros;
    requireValue(
      delta >= 0 && delta <= f.wallet.reserved_micros,
      "SPEND_ENVELOPE",
      "Mock spend exceeds its source reservation.",
    );
    f.wallet.spent_micros += delta;
    f.wallet.reserved_micros -= delta;
    return {
      source: "fixture_hellyeah_google",
      source_mode: "fixture",
      organization_id: f.organization_id,
      scope: "managed_account_rollup",
      campaign_ids: [f.campaign.id],
      managed_account_id: f.campaign.managed_account_id,
      source_revision: revision,
      period_start: new Date(Date.parse(this.at) - 30 * 864e5).toISOString(),
      period_end: this.at,
      observed_at: this.at,
      currency: "USD",
      channel: "Search",
      spend_micros: spend,
      net_revenue_micros:
        quality === "healthy" ? 62_000_000_000 : 22_000_000_000,
      margin_bps: 5500,
      fee_bps: 500,
      mature: true,
      mature_conversions: 250,
      tracker_verified: true,
      current_budget_micros: 20_000_000_000,
      wallet_available_micros: f.wallet.available_micros,
      eligible: 250,
      qualified: quality === "healthy" ? 175 : 25,
      marginal: p.marginal,
    };
  }
}

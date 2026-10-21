import { z } from "zod";
import { intMoney, requireValue, digest } from "../contracts.mjs";
import { COHORT, emptyLearning, isSampleOutcome } from "../learning.mjs";
// Normalized internal port contract, not an invented public Hellyeah or Google API.
export const reportSchema = z
  .object({
    source: z.literal("fixture_hellyeah_google"),
    source_mode: z.literal("fixture"),
    organization_id: z.string(),
    scope: z.literal("managed_account_rollup"),
    campaign_ids: z.array(z.string().min(1).max(80)).min(1).max(100),
    managed_account_id: z.string().startsWith("fixture_"),
    source_revision: z.number().int().positive().max(1e9),
    period_start: z.iso.datetime(),
    period_end: z.iso.datetime(),
    observed_at: z.iso.datetime(),
    currency: z.literal("USD"),
    channel: z.literal("Search"),
    spend_micros: intMoney,
    net_revenue_micros: intMoney,
    margin_bps: z.number().int().min(1).max(10000).nullable(),
    fee_bps: z.number().int().min(0).max(10000),
    mature: z.boolean(),
    mature_conversions: z.number().int().min(0).max(1e7),
    tracker_verified: z.boolean(),
    current_budget_micros: intMoney.min(1),
    wallet_available_micros: intMoney,
    eligible: z.number().int().min(0).max(10000),
    qualified: z.number().int().min(0),
    marginal: z
      .object({
        certification: z.enum(["unvalidated", "synthetic_passing_case"]),
        expires_at: z.iso.datetime(),
        bounds: z
          .array(
            z
              .object({
                max_increment_micros: intMoney,
                lower_roas_bps: z.number().int().min(0).max(100000),
              })
              .strict(),
          )
          .min(1)
          .max(20),
      })
      .strict(),
  })
  .strict()
  .refine((x) => x.qualified <= x.eligible, {
    message: "Qualified outcomes exceed eligible outcomes.",
  });
export function ingestReport(state, raw, context) {
  const p = reportSchema.parse(raw);
  requireValue(
    p.organization_id === context.organization_id,
    "ORGANIZATION_DENIED",
    "Source report belongs to another workspace.",
    403,
  );
  requireValue(
    Date.parse(p.period_start) < Date.parse(p.period_end) &&
      Date.parse(p.period_end) <= Date.parse(p.observed_at) &&
      Date.parse(p.observed_at) <= Date.parse(context.at),
    "REPORT_TIME",
    "Report timestamps are inconsistent or in the future.",
  );
  requireValue(
    p.marginal.bounds.every(
      (b, i, a) =>
        i === 0 || b.max_increment_micros > a[i - 1].max_increment_micros,
    ),
    "MARGINAL_BOUNDS",
    "Marginal intervals must be strictly ordered.",
  );
  requireValue(
    !state.bound_managed_account_id ||
      state.bound_managed_account_id === p.managed_account_id,
    "MANAGED_ACCOUNT_SCOPE",
    "Report account differs from the bound source account.",
    403,
  );
  const windowKey = digest([
      p.source,
      p.organization_id,
      p.managed_account_id,
      p.period_start,
      p.period_end,
    ]),
    payloadHash = digest(p);
  state.source_reports ??= [];
  state.learning ??= emptyLearning();
  const old = state.source_reports.find((x) => x.window_key === windowKey);
  if (old) {
    requireValue(
      p.source_revision >= old.source_revision,
      "STALE_REPORT",
      "An older source revision cannot replace a corrected report.",
      409,
    );
    if (p.source_revision === old.source_revision) {
      requireValue(
        old.payload_hash === payloadHash,
        "SOURCE_EVENT_CONFLICT",
        "Source revision already contains different values.",
        409,
      );
      return { changed: false, window_key: windowKey };
    }
  }
  for (const x of state.source_reports) {
    if (
      x.window_key === windowKey ||
      x.managed_account_id !== p.managed_account_id
    )
      continue;
    requireValue(
      Date.parse(p.period_start) >= Date.parse(x.period_end) ||
        Date.parse(p.period_end) <= Date.parse(x.period_start),
      "OVERLAPPING_OUTCOMES",
      "Outcome windows must be non-overlapping; revise the same window to correct it.",
      409,
    );
  }
  requireValue(
    old || state.source_reports.length < 100,
    "PILOT_RECORD_LIMIT",
    "The pilot supports 100 source windows.",
    409,
  );
  requireValue(
    state.learning.observations.filter((x) => !isSampleOutcome(x)).length < 500,
    "PILOT_RECORD_LIMIT",
    "Pilot outcome storage capacity reached.",
    409,
  );
  state.bound_managed_account_id = p.managed_account_id;
  state.learning.observations = state.learning.observations.filter(
    (x) => !isSampleOutcome(x),
  );
  for (const x of state.learning.observations)
    if (x.source_window === windowKey) x.superseded = true;
  state.learning.observations.push({
    external_id: `report:${windowKey}:v${p.source_revision}`,
    at: p.period_end,
    source_mode: "fixture",
    eligible: p.eligible,
    qualified: p.qualified,
    mature: p.mature,
    campaign_id: p.managed_account_id,
    cohort: COHORT,
    source_window: windowKey,
    superseded: false,
  });
  const ref = {
    window_key: windowKey,
    source_revision: p.source_revision,
    payload_hash: payloadHash,
    campaign_ids: p.campaign_ids,
    scope: p.scope,
    managed_account_id: p.managed_account_id,
    period_start: p.period_start,
    period_end: p.period_end,
    observed_at: p.observed_at,
  };
  state.source_reports = state.source_reports.filter(
    (x) => x.window_key !== windowKey,
  );
  state.source_reports.push(ref);
  if (
    !state.snapshot.source_window_end ||
    Date.parse(p.period_end) >= Date.parse(state.snapshot.source_window_end)
  )
    state.snapshot = {
      id: `report_${payloadHash.slice(0, 24)}`,
      version: p.source_revision,
      source_mode: "fixture",
      name: "source_report",
      at: p.period_end,
      currency: p.currency,
      channel: p.channel,
      spend_micros: p.spend_micros,
      net_revenue_micros: p.net_revenue_micros,
      margin_bps: p.margin_bps,
      fee_bps: p.fee_bps,
      mature: p.mature,
      mature_conversions: p.mature_conversions,
      tracker_verified: p.tracker_verified,
      current_budget_micros: p.current_budget_micros,
      wallet_available_micros: p.wallet_available_micros,
      window_days: Math.round(
        (Date.parse(p.period_end) - Date.parse(p.period_start)) / 864e5,
      ),
      attribution:
        "Normalized mock source report; attributed value, not causal incrementality",
      marginal: p.marginal,
      source_window_end: p.period_end,
      source_ref: ref,
    };
  return {
    changed: true,
    window_key: windowKey,
    source_revision: p.source_revision,
    previous_revision: old?.source_revision ?? null,
  };
}

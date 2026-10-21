import { z } from "zod";

// Learning ranks hypotheses and can veto expansion. It never manufactures marginal ROI evidence.
export const LEARNING_VERSION = "hierarchical-quality-v1";
export const COHORT = "Search:USD:lead_quality:v1";
export const outcomeSchema = z
  .object({
    external_id: z.string().min(1).max(128),
    at: z.iso.datetime(),
    source_mode: z.literal("fixture"),
    eligible: z.number().int().min(1).max(10000),
    qualified: z.number().int().min(0),
    mature: z.boolean(),
    campaign_id: z.string().max(80),
    cohort: z.literal(COHORT),
  })
  .strict()
  .refine((x) => x.qualified <= x.eligible, {
    message: "Qualified outcomes cannot exceed eligible outcomes.",
  });
export const emptyLearning = () => ({
  version: LEARNING_VERSION,
  opt_in: false,
  observations: [],
  model: null,
  benchmark: null,
  updated_at: null,
});
// The legacy identifier check keeps saved workspaces from the first release compatible.
export const isSampleOutcome = (row) =>
  row.dataset === "ui_sample" ||
  (!row.source_window &&
    !row.dataset &&
    /^sample-week-\d+$/.test(row.external_id));
const sum = (xs, f) => xs.reduce((n, x) => n + f(x), 0);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round5 = (n) => Math.round(n / 5) * 5;
const emptyAggregate = () => ({
  available: false,
  participants: 0,
  eligible: 0,
  qualified: 0,
  cohort: COHORT,
  source_mode: "fixture",
  reason:
    "At least five other opted-in workspaces with mature outcomes are required.",
});
export function contributionFor(state, at) {
  const l = state.learning ?? emptyLearning();
  const rows = l.observations.filter(
    (x) =>
      !x.superseded &&
      x.mature &&
      x.cohort === COHORT &&
      Date.parse(x.at) <= Date.parse(at) &&
      Date.parse(at) - Date.parse(x.at) <= 90 * 864e5,
  );
  const n = sum(rows, (x) => x.eligible),
    q = sum(rows, (x) => x.qualified);
  if (!l.opt_in || n < 20) return null;
  // Each workspace has identical maximum weight; no text, campaign IDs, or identities leave its record.
  return {
    organization_id: state.organization_id,
    cohort: COHORT,
    source_mode: "fixture",
    eligible: 100,
    qualified: Math.round((100 * q) / n),
    updated_at: at,
  };
}
export function aggregateCohort(contributions, { excludeOrganization, at }) {
  const rows = contributions.filter(
    (x) =>
      x.organization_id !== excludeOrganization &&
      x.cohort === COHORT &&
      x.source_mode === "fixture" &&
      Date.parse(at) - Date.parse(x.updated_at) <= 7 * 864e5 &&
      Date.parse(x.updated_at) <= Date.parse(at),
  );
  const unique = [...new Map(rows.map((x) => [x.organization_id, x])).values()];
  return releaseCohort({
    participants: unique.length,
    qualified: sum(unique, (x) => clamp(x.qualified, 0, 100)),
  });
}
export function releaseCohort({ participants, qualified }) {
  if (participants < 5) return emptyAggregate();
  return {
    available: true,
    participants,
    eligible: 100 * participants,
    qualified: round5(qualified),
    cohort: COHORT,
    source_mode: "fixture",
    reason:
      "Opt-in, minimum five other workspaces, equal workspace weight, rounded counts. Not differential privacy.",
  };
}

function rateInterval(a, b) {
  const mean = a / (a + b),
    sd = Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1)));
  return {
    mean,
    lower: clamp(mean - 1.96 * sd, 0, 1),
    upper: clamp(mean + 1.96 * sd, 0, 1),
  };
}
export function learnCustomer(
  state,
  aggregate = emptyAggregate(),
  at = new Date().toISOString(),
) {
  const observations = state.learning?.observations ?? [];
  const mature = observations.filter(
    (x) =>
      !x.superseded &&
      x.mature &&
      Date.parse(x.at) <= Date.parse(at) &&
      Date.parse(at) - Date.parse(x.at) <= 90 * 864e5,
  );
  // A cohort supplies at most 20 pseudo-observations, so customer evidence rapidly dominates.
  const priorStrength = aggregate.available ? 20 : 2,
    priorMean = aggregate.available
      ? clamp(aggregate.qualified / aggregate.eligible, 0.05, 0.95)
      : 0.5;
  let n = 0,
    q = 0,
    weight2 = 0;
  for (const row of mature) {
    const w = 2 ** (-(Date.parse(at) - Date.parse(row.at)) / (30 * 864e5));
    n += w * row.eligible;
    q += w * row.qualified;
    weight2 += w * w * row.eligible;
  }
  const posterior = rateInterval(
    priorMean * priorStrength + q,
    (1 - priorMean) * priorStrength + n - q,
  );
  const recent = mature.filter(
      (x) => Date.parse(at) - Date.parse(x.at) <= 14 * 864e5,
    ),
    previous = mature.filter(
      (x) => Date.parse(at) - Date.parse(x.at) > 14 * 864e5,
    );
  const nr = sum(recent, (x) => x.eligible),
    qr = sum(recent, (x) => x.qualified),
    np = sum(previous, (x) => x.eligible),
    qp = sum(previous, (x) => x.qualified);
  const recentRate = nr ? qr / nr : null,
    previousRate = np ? qp / np : null;
  const drift =
    nr >= 50 && np >= 50 && previousRate > 0 && recentRate < previousRate * 0.7;
  const sufficient = n >= 50,
    poor = sufficient && posterior.upper < 0.35;
  const explicit = state.feedback.filter((x) => x.source !== "product_action");
  const preferences = [
    ...new Set(
      explicit
        .filter((x) => x.polarity === "negative" && x.status !== "resolved")
        .map((x) => x.category),
    ),
  ];
  const last = mature.map((x) => Date.parse(x.at)).sort((a, b) => b - a)[0];
  return {
    version: LEARNING_VERSION,
    at,
    mode: "shadow",
    evidence_mode: "fixture",
    mature_rows: mature.length,
    pending_rows: observations.filter((x) => !x.superseded && !x.mature).length,
    weighted_observations: Math.round(n),
    effective_sample_size: weight2 ? Math.round((n * n) / weight2) : 0,
    qualification: posterior,
    interval_method:
      "Approximate 95% Beta posterior normal interval; quality rate, not revenue forecast",
    prior_source: aggregate.available
      ? "opt_in_aggregate"
      : "weak_neutral_prior",
    prior_strength: priorStrength,
    personal_weight: n / (n + priorStrength),
    aggregate,
    drift: {
      detected: drift,
      recent_rate: recentRate,
      previous_rate: previousRate,
      recent_n: nr,
      previous_n: np,
    },
    stale: !!last && Date.parse(at) - last > 30 * 864e5,
    poor_quality: poor,
    expansion_veto: drift || poor,
    preferences,
    next_best_learning: drift
      ? "Investigate the recent quality drop."
      : !sufficient
        ? "Collect mature customer outcomes."
        : poor
          ? "Improve qualification before increasing budget."
          : "Test a new hypothesis in shadow mode; keep exact spend approval.",
    improvement_claim: null,
  };
}
export function sampleLearning(at) {
  return Array.from({ length: 12 }, (_, i) => ({
    external_id: `sample-week-${i}`,
    dataset: "ui_sample",
    at: new Date(Date.parse(at) - (i * 5 + 1) * 864e5).toISOString(),
    source_mode: "fixture",
    eligible: 40,
    qualified: 24 + (i % 4),
    mature: true,
    campaign_id: "c1",
    cohort: COHORT,
  }));
}
export const benchmarkSchema = z
  .object({
    dataset_id: z.string().min(3).max(128),
    source_mode: z.literal("fixture"),
    pairs: z
      .array(
        z
          .object({
            unit_id: z.string().min(1).max(100),
            baseline_contribution: z.number().finite().min(-1e6).max(1e6),
            challenger_contribution: z.number().finite().min(-1e6).max(1e6),
            guardrail_violation: z.boolean(),
          })
          .strict(),
      )
      .min(2)
      .max(500),
  })
  .strict();
export function benchmarkPolicies(input) {
  const data = benchmarkSchema.parse(input);
  if (new Set(data.pairs.map((x) => x.unit_id)).size !== data.pairs.length)
    throw new Error("Benchmark units must be unique.");
  const rows = data.pairs,
    n = rows.length,
    base = sum(rows, (x) => x.baseline_contribution) / n,
    next = sum(rows, (x) => x.challenger_contribution) / n,
    delta = next - base;
  // Paired unit bootstrap: resample independent units, never individual correlated conversions.
  let seed = 71;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const ds = [],
    ratios = [];
  for (let b = 0; b < 1000; b++) {
    let x = 0,
      y = 0;
    for (let i = 0; i < n; i++) {
      const row = rows[Math.floor(random() * n)];
      x += row.baseline_contribution;
      y += row.challenger_contribution;
    }
    ds.push((y - x) / n);
    ratios.push(x > 0 ? y / x : null);
  }
  ds.sort((a, b) => a - b);
  const valid = ratios.filter((x) => x !== null).sort((a, b) => a - b),
    ratioLow = valid.length === 1000 ? valid[25] : null;
  const violations = rows.filter((x) => x.guardrail_violation).length;
  return {
    dataset_id: data.dataset_id,
    source_mode: data.source_mode,
    independent_units: n,
    baseline_mean: base,
    challenger_mean: next,
    mean_delta: delta,
    delta_interval: [ds[25], ds[974]],
    observed_factor: base > 0 ? next / base : null,
    factor_lower_bound: ratioLow,
    guardrail_violations: violations,
    target_factor: 2,
    target_met:
      n >= 30 &&
      ratioLow !== null &&
      ratioLow >= 2 &&
      ds[25] > 0 &&
      violations === 0,
    release_status:
      "Shadow only — synthetic replay cannot certify production lift",
    method:
      "1000 deterministic paired bootstrap resamples; assumes independently randomized, matched units. Dataset validity requires separate review.",
  };
}
export function sampleBenchmark() {
  return {
    dataset_id: "synthetic-paired-v1",
    source_mode: "fixture",
    pairs: Array.from({ length: 40 }, (_, i) => ({
      unit_id: `fixture-unit-${i}`,
      baseline_contribution: 100 + (i % 8) * 12,
      challenger_contribution: 125 + (i % 8) * 15,
      guardrail_violation: false,
    })),
  };
}

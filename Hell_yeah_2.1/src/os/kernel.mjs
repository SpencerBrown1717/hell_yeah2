import { ingestReport } from "./adapters/report-contract.mjs";
import { submitProposal, reviewProposal } from "./proposals.mjs";
import { normalizeFeedback } from "./feedback.mjs";
import { applyOptimization } from "./optimization-state.mjs";
import { applyWalletGrowth } from "./wallet-growth.mjs";
export { normalizeFeedback, synthesizeFeedback } from "./feedback.mjs";
export { evaluateGrowth } from "./policy.mjs";
import { z } from "zod";
import {
  ORG,
  OSError,
  requireValue,
  digest,
  policySchema,
  policyDefaults,
} from "./contracts.mjs";
export * from "./contracts.mjs";
import {
  emptyLearning,
  outcomeSchema,
  sampleLearning,
  isSampleOutcome,
  benchmarkPolicies,
  sampleBenchmark,
} from "./learning.mjs";

export function sampleSnapshot(
  name = "baseline",
  at = new Date().toISOString(),
) {
  requireValue(
    ["baseline", "scale_ready", "poor_returns", "tracking_gap"].includes(name),
    "UNKNOWN_SAMPLE",
  );
  return {
    id: `sample_${name}_${digest(at).slice(0, 12)}`,
    version: 1,
    source_mode: "fixture",
    name,
    at,
    currency: "USD",
    channel: "Search",
    spend_micros: 18_462_000_000,
    net_revenue_micros:
      name === "poor_returns" ? 22_000_000_000 : 62_000_000_000,
    margin_bps: 5500,
    fee_bps: 500,
    mature: true,
    mature_conversions: 684,
    tracker_verified: name !== "tracking_gap",
    current_budget_micros: 20_000_000_000,
    wallet_available_micros: 12_000_000_000,
    window_days: 30,
    attribution:
      "Deduplicated sample X-Ray attributed purchases; not causal incrementality",
    marginal: {
      certification:
        name === "baseline" ? "unvalidated" : "synthetic_passing_case",
      expires_at: new Date(Date.parse(at) + 48 * 3600 * 1000).toISOString(),
      bounds: [
        { max_increment_micros: 1_000_000_000, lower_roas_bps: 30000 },
        { max_increment_micros: 2_000_000_000, lower_roas_bps: 27000 },
        { max_increment_micros: 4_000_000_000, lower_roas_bps: 18000 },
      ],
    },
  };
}
export function initialOS(
  at = new Date().toISOString(),
  organization_id = ORG,
) {
  return {
    organization_id,
    mode: "fixture",
    policy: structuredClone(policyDefaults),
    policy_version: 1,
    snapshot: sampleSnapshot("baseline", at),
    feedback: [],
    decisions: [],
    latest: null,
    review_handoffs: [],
    proposals: [],
    last_evaluated_at: null,
    cooldown_until: null,
    learning: emptyLearning(),
  };
}
export function applyCommand(state, command, context) {
  const events = [];
  const { kind, payload } = command;
  requireValue(
    state.organization_id === context.organization_id,
    "ORGANIZATION_DENIED",
    "Workspace mismatch.",
    403,
  );
  if (kind.startsWith("optimization_")) return applyOptimization(state, command, context);
  if (kind.startsWith("wallet_")) return applyWalletGrowth(state, command, context);
  if (kind === "feedback" || kind === "feedback_batch") {
    const inputs = kind === "feedback" ? [payload] : payload.items;
    requireValue(
      Array.isArray(inputs) && inputs.length > 0 && inputs.length <= 100,
      "BATCH_LIMIT",
      "Provide 1–100 feedback records.",
    );
    for (const input of inputs) {
      const f = normalizeFeedback(input, context),
        old = state.feedback.find((x) => x.source_key === f.source_key);
      if (old) {
        requireValue(
          old.payload_hash === f.payload_hash,
          "SOURCE_EVENT_CONFLICT",
          "The source event ID already has different content.",
          409,
        );
        continue;
      }
      requireValue(
        state.feedback.length < 500,
        "PILOT_RECORD_LIMIT",
        "The pilot holds 500 feedback records; export and extend retention before more ingestion.",
        409,
      );
      state.feedback.unshift(f);
      events.push({ type: "feedback.received", data: f });
    }
  } else if (kind === "resolve_feedback") {
    const p = z
      .object({ id: z.string(), note: z.string().trim().min(10).max(1000) })
      .strict()
      .parse(payload);
    const f = state.feedback.find((f) => f.id === p.id);
    requireValue(f, "FEEDBACK_NOT_FOUND", "Feedback was not found.", 404);
    requireValue(
      f.status !== "resolved",
      "ALREADY_RESOLVED",
      "Feedback is already resolved.",
      409,
    );
    f.status = "resolved";
    f.resolution = { note: p.note, actor_id: context.actor_id, at: context.at };
    events.push({
      type: "feedback.resolved",
      data: { id: f.id, ...f.resolution },
    });
  } else if (kind === "policy") {
    const p = z
      .object({ expected_version: z.number().int(), policy: policySchema })
      .strict()
      .parse(payload);
    requireValue(
      p.expected_version === state.policy_version,
      "STALE_POLICY",
      "The growth policy changed. Refresh before saving.",
      409,
    );
    state.policy = p.policy;
    state.policy_version++;
    state.cooldown_until = null;
    events.push({
      type: "policy.updated",
      data: { version: state.policy_version, policy: p.policy },
    });
  } else if (kind === "sample") {
    requireValue(
      !state.bound_managed_account_id,
      "INGESTED_EVIDENCE_PRESENT",
      "This workspace has source-owned financial facts. Run the isolated mock campaign to explore sample economics.",
      409,
    );
    const p = z
      .object({
        name: z.enum([
          "baseline",
          "scale_ready",
          "poor_returns",
          "tracking_gap",
        ]),
      })
      .strict()
      .parse(payload);
    state.snapshot = sampleSnapshot(p.name, context.at);
    events.push({ type: "sample.selected", data: { name: p.name } });
  } else if (kind === "respond") {
    const p = z
      .object({
        decision_id: z.string(),
        response: z.enum(["accept", "decline"]),
        reason: z.string().trim().min(3).max(1000),
      })
      .strict()
      .parse(payload);
    const d = state.decisions.find((d) => d.id === p.decision_id);
    requireValue(d, "DECISION_NOT_FOUND", "Decision not found.", 404);
    requireValue(
      d.status === "Pending",
      "DECISION_ALREADY_HANDLED",
      "This decision already has a response.",
      409,
    );
    if (p.response === "accept") {
      requireValue(
        state.latest?.id === d.id && d.policy_version === state.policy_version,
        "STALE_DECISION",
        "New evidence is available. Review the latest decision.",
        409,
      );
      requireValue(
        Date.parse(d.valid_until) > Date.parse(context.at),
        "EXPIRED_DECISION",
        "This decision expired. Evaluate again.",
        409,
      );
      requireValue(
        d.type === "bounded_expansion",
        "NO_EXPANSION",
        "This decision does not authorize a growth handoff.",
        409,
      );
      state.review_handoffs.unshift({
        id: `review_${d.id}`,
        decision_id: d.id,
        maximum_additional_micros: d.chosen.increment_micros,
        policy_version: d.policy_version,
        input_hash: d.input_hash,
        state: "Draft for Hellyeah review",
        mode: "fixture",
        at: context.at,
      });
    }
    requireValue(
      state.feedback.length < 500,
      "PILOT_RECORD_LIMIT",
      "Pilot feedback capacity reached.",
      409,
    );
    if (p.response === "decline")
      state.cooldown_until = new Date(
        Date.parse(context.at) + 7 * 864e5,
      ).toISOString();
    d.status = p.response === "accept" ? "Accepted for review" : "Declined";
    d.response = { ...p, actor_id: context.actor_id, at: context.at };
    if (state.latest?.id === d.id) state.latest = structuredClone(d);
    events.push({ type: `decision.${p.response}`, data: d.response });
    const f = normalizeFeedback(
      {
        source: "product_action",
        external_id: `decision-response:${d.id}`,
        category: "recommendation",
        polarity: p.response === "accept" ? "positive" : "negative",
        severity: "low",
        text: p.reason,
        action: p.response === "accept" ? "approved" : "dismissed",
      },
      context,
    );
    state.feedback.unshift(f);
  } else if (kind === "withdraw_handoff") {
    const p = z
      .object({ id: z.string(), note: z.string().trim().min(3).max(1000) })
      .strict()
      .parse(payload);
    const h = state.review_handoffs.find((x) => x.id === p.id);
    requireValue(
      h && h.state !== "Withdrawn",
      "HANDOFF_NOT_FOUND",
      "Active handoff not found.",
      404,
    );
    h.state = "Withdrawn";
    h.withdrawal = { note: p.note, at: context.at, actor_id: context.actor_id };
    events.push({
      type: "review.withdrawn",
      data: { id: h.id, ...h.withdrawal },
    });
  } else if (kind === "learning_consent") {
    const p = z.object({ opt_in: z.boolean() }).strict().parse(payload);
    state.learning ??= emptyLearning();
    state.learning.opt_in = p.opt_in;
    events.push({ type: "learning.consent", data: p });
  } else if (kind === "outcomes") {
    const p = z
      .object({ items: z.array(outcomeSchema).min(1).max(100) })
      .strict()
      .parse(payload);
    state.learning ??= emptyLearning();
    state.learning.observations = state.learning.observations.filter(
      (x) => !isSampleOutcome(x),
    );
    for (const row of p.items) {
      requireValue(
        Date.parse(row.at) <= Date.parse(context.at),
        "FUTURE_EVENT",
        "Outcome cannot be in the future.",
      );
      const old = state.learning.observations.find(
        (x) => x.external_id === row.external_id,
      );
      if (old) {
        requireValue(
          digest(old) === digest(row),
          "SOURCE_EVENT_CONFLICT",
          "Outcome ID already has different data.",
          409,
        );
        continue;
      }
      requireValue(
        state.learning.observations.length < 500,
        "PILOT_RECORD_LIMIT",
        "Pilot outcome capacity reached.",
        409,
      );
      state.learning.observations.push(row);
      events.push({
        type: "outcome.received",
        data: { external_id: row.external_id },
      });
    }
  } else if (kind === "learning_sample") {
    z.object({}).strict().parse(payload);
    state.learning ??= emptyLearning();
    requireValue(
      state.learning.observations.every(isSampleOutcome),
      "INGESTED_EVIDENCE_PRESENT",
      "This workspace has ingested outcomes. Run the isolated mock campaign to explore samples without changing that evidence.",
      409,
    );
    state.learning.observations = sampleLearning(context.at);
    events.push({
      type: "learning.sample_loaded",
      data: { count: state.learning.observations.length },
    });
  } else if (kind === "benchmark") {
    z.object({}).strict().parse(payload);
    state.learning ??= emptyLearning();
    state.learning.benchmark = benchmarkPolicies(sampleBenchmark());
    events.push({
      type: "benchmark.completed",
      data: state.learning.benchmark,
    });
  } else if (kind === "source_report") {
    const result = ingestReport(state, payload, context);
    if (result.changed)
      events.push({
        type: "source.report_ingested",
        data: { ...result, report: payload },
      });
  } else if (kind === "record_product_demo") {
    state.demo_runs = [payload.result, ...(state.demo_runs ?? []).filter(r => r.id !== payload.result.id)].slice(0, 10);
    events.push({ type: "demo.product_loop_completed", data: payload.result });
  } else if (kind === "record_mock_trial") {
    state.last_mock_trial = payload.result;
    events.push({ type: "mock.campaign_completed", data: payload.result });
  } else if (kind === "submit_proposal") {
    const result = submitProposal(state, payload, context);
    if (result.created)
      events.push({ type: "proposal.submitted", data: result.proposal });
  } else if (kind === "review_proposal") {
    const result = reviewProposal(state, payload, context);
    events.push({ type: "proposal.reviewed", data: result });
  } else if (kind === "evaluate") {
    z.object({}).strict().parse(payload);
  } else throw new OSError("UNKNOWN_COMMAND", "Unsupported OS command.");
  state.learning ??= emptyLearning();
  return {
    state,
    events,
    reevaluate:
      ![
        "respond",
        "record_mock_trial",
        "record_product_demo",
        "submit_proposal",
        "review_proposal",
      ].includes(kind) &&
      (kind === "evaluate" || events.length > 0),
  };
}

import { z } from "zod";
import { digest, intMoney, requireValue } from "./contracts.mjs";

const reference = z.string().min(1).max(128);
const base = {
  external_id: reference,
  title: z.string().trim().min(3).max(200),
  evidence_mode: z.literal("fixture"),
};
export const proposalSchema = z.discriminatedUnion("product", [
  z
    .object({
      ...base,
      product: z.literal("simulator"),
      data: z
        .object({
          budget_micros: intMoney.min(1),
          days: z.number().int().min(1).max(365),
          channel: z.enum(["Search", "PMax"]),
          goal: z.enum(["conversions", "impressions"]),
          creative_id: reference,
          creative_version: z.number().int().positive(),
          brand_version: z.number().int().positive(),
          calibration: z.literal("unvalidated"),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...base,
      product: z.literal("creative"),
      data: z
        .object({
          creative_id: reference,
          creative_version: z.number().int().positive(),
          angle: z.string().trim().min(1).max(200),
          observation: z.string().trim().min(3).max(2000),
          evidence_grade: z.literal("observed_fixture"),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...base,
      product: z.literal("experiments"),
      data: z
        .object({
          hypothesis: z.string().trim().min(15).max(1000),
          creative_id: reference,
          unit: z.literal("owned_site_visitor"),
          metric: z.literal("purchases_per_assigned_visitor"),
          allocation_bps: z.literal(5000),
          target_assignments: z.number().int().min(100).max(10000000),
          inference: z.literal("not_certified"),
        })
        .strict(),
    })
    .strict(),
]);

export function submitProposal(state, raw, context) {
  const payload = proposalSchema.parse(raw);
  const content_hash = digest(payload);
  state.proposals ??= [];
  const old = state.proposals.find((p) => p.content_hash === content_hash);
  if (old) return { created: false, proposal: old };
  requireValue(
    state.proposals.length < 100,
    "PILOT_RECORD_LIMIT",
    "The pilot supports 100 research proposals. Export evidence before extending retention.",
    409,
  );
  const prior = state.proposals.find(
    (p) =>
      p.product === payload.product && p.external_id === payload.external_id,
  );
  const proposal = {
    ...payload,
    id: `proposal_${digest([context.organization_id, content_hash]).slice(0, 24)}`,
    content_hash,
    revision: (prior?.revision ?? 0) + 1,
    supersedes: prior?.id ?? null,
    status: "Queued for evidence review",
    submitted_at: context.at,
    submitted_by: context.actor_id,
    spend_authority: false,
  };
  state.proposals.unshift(proposal);
  return { created: true, proposal };
}

export function reviewProposal(state, raw, context) {
  const payload = z
    .object({
      id: reference,
      content_hash: z.string().length(64),
      response: z.enum(["accept_research", "dismiss"]),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(raw);
  const proposal = state.proposals?.find((p) => p.id === payload.id);
  requireValue(
    proposal,
    "PROPOSAL_NOT_FOUND",
    "Evidence proposal was not found.",
    404,
  );
  requireValue(
    proposal.status === "Queued for evidence review",
    "PROPOSAL_ALREADY_REVIEWED",
    "This evidence already has a review.",
    409,
  );
  requireValue(
    proposal.content_hash === payload.content_hash &&
      !state.proposals.some((p) => p.supersedes === proposal.id),
    "STALE_PROPOSAL",
    "The evidence changed. Review the newest revision.",
    409,
  );
  proposal.status =
    payload.response === "accept_research"
      ? "Accepted for research"
      : "Dismissed";
  proposal.review = { ...payload, at: context.at, actor_id: context.actor_id };
  return { id: proposal.id, status: proposal.status, ...proposal.review };
}

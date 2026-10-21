import { requireValue } from "../contracts.mjs";
import { draftReceipt } from "../optimization-contracts.mjs";
import { optimizationContext } from "../optimization-state.mjs";

/**
 * Bind these methods to Hellyeah internal services during integration.
 * They are semantic ports, not invented public HTTP endpoints.
 * lookup and prepareDraft must be org-scoped and idempotent on operation_id.
 */
export async function prepareOptimizationDraft({ repository, organization_id, source_mode, proposal_id, port }) {
  requireValue(port && typeof port.lookup === "function" && typeof port.prepareDraft === "function", "DRAFT_ADAPTER_NOT_BOUND", "Connect the managed-platform draft adapter before handing off changes.", 409);
  const loaded = await repository.load(organization_id);
  const c = optimizationContext(loaded.state, source_mode);
  const proposal = c.proposals.find(p => p.id === proposal_id);
  requireValue(proposal, "PROPOSAL_NOT_FOUND", "Review this campaign change before preparing a draft.", 404);
  if (proposal.receipt) return proposal.receipt;
  const operation_id = proposal.id, request = { operation_id, organization_id, source_mode, proposal_id, plan_hash: proposal.plan_hash, plan: proposal.plan };
  // Recover a lost acknowledgement before attempting another external write.
  let result = await port.lookup(request);
  if (!result) {
    await repository.refreshOptimization(loaded.state);
    const fresh = optimizationContext(loaded.state, source_mode).model;
    requireValue(fresh.input_hash === proposal.plan.input_hash
      && fresh.strategies.some(s => s.strategy_id === proposal.plan.strategy_id && s.action === "review_campaign_draft"),
    "STALE_OPTIMIZATION", "Evidence changed; a new campaign review is required.", 409);
    requireValue(proposal.plan.requested_budget_micros === proposal.plan.existing_budget_micros && proposal.plan.spend_authority === false,
      "SPEND_NOT_AUTHORIZED", "This adapter can only prepare a draft within the recorded budget.", 403);
    result = await port.prepareDraft(request);
  }
  const receipt = draftReceipt.parse(result);
  requireValue(receipt.organization_id === organization_id && receipt.source_mode === source_mode
    && receipt.proposal_id === proposal_id && receipt.plan_hash === proposal.plan_hash && receipt.operation_id === operation_id,
  "DRAFT_MISMATCH", "The platform receipt does not match this account's exact change.", 409);
  await repository.execute({ organization_id, actor_id: "service:managed-platform-drafts",
    key: "draft-receipt:" + operation_id,
    command: { kind: "optimization_receipt", payload: receipt } });
  return receipt;
}

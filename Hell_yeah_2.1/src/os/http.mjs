import { isService, requestIdentity, checkOrigin, readJSON, jsonResponse, httpError } from "./http-boundary.mjs";
import { OSJobRepository } from "./job-repository.mjs";
import { handleJobs, handleWorker } from "./jobs-http.mjs";
import { runMockCampaignTrial } from "./mock-campaign-trial.mjs";
import { runProductDemo } from "./product-demo.mjs";
import { requireValue, digest } from "./kernel.mjs";
import { z } from "zod";
import { fundingAdvice } from "./wallet-growth.mjs";
import { prepareOptimizationDraft } from "./adapters/campaign-draft-port.mjs";
import { prepareWalletCheckout } from "./adapters/wallet-checkout-port.mjs";
const envelope = z
  .object({
    kind: z.enum([
      "feedback",
      "feedback_batch",
      "resolve_feedback",
      "policy",
      "sample",
      "respond",
      "evaluate",
      "withdraw_handoff",
      "learning_consent",
      "learning_sample",
      "outcomes",
      "benchmark",
      "source_report",
      "mock_campaign",
      "product_demo",
      "submit_proposal",
      "review_proposal",
      "optimization_configure",
      "optimization_register",
      "optimization_report",
      "optimization_propose",
      "optimization_receipt",
      "wallet_preferences",
      "wallet_intent",
      "wallet_checkout_receipt",
      "wallet_prepare_checkout",
      "optimization_prepare_draft",
    ]),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();
export async function handleOS(request, { repository, serviceKey, privateWorkerEnabled = false, draftPort = null, checkoutPort = null }) {
  const respond = jsonResponse;
  const integration_ports = { managed_drafts: !!draftPort, wallet_checkout: !!checkoutPort };
  const present = result => ({ ...result, integration_ports, funding_advice: fundingAdvice(result.state, repository.clock()) });
  try {
    const path = new URL(request.url).pathname;
    const service = isService(request, serviceKey);
    const queue = new OSJobRepository(repository);
    if (path === "/api/os/worker") return await handleWorker(request, { queue, service, privateWorkerEnabled });
    const identity = requestIdentity(request, service);
    const { actor_id: actor, organization_id } = identity;
    if (path === "/api/os/source-cursor") {
      requireValue(service, "SOURCE_AUTHORITY", "Source cursors are available to the trusted ingestion adapter only.", 403);
      requireValue(request.method === "GET", "METHOD_NOT_ALLOWED", "Use GET.", 405);
      const params = new URL(request.url).searchParams;
      const source = z.literal("fixture_hellyeah_google").parse(params.get("source"));
      const account = z.string().startsWith("fixture_").max(100).parse(params.get("account"));
      return respond({ organization_id, source, managed_account_id: account, ...await queue.cursor(organization_id, source, account) });
    }
    if (path === "/api/os/jobs") return await handleJobs(request, { queue, identity, service });
    requireValue(["/api/os", "/api/os/", "/api/os/audit"].includes(path), "NOT_FOUND", "OS route not found.", 404);
    if (request.method === "GET") {
      if (path.endsWith("/audit"))
        return respond({ events: await repository.audit(organization_id) });
      const loaded = await repository.load(organization_id);
      const aggregate = await repository.cohort(organization_id);
      const now = Date.parse(repository.clock());
      return respond({
        ...loaded,
        integration_ports,
        funding_advice: fundingAdvice(loaded.state, repository.clock()),
        learning_refresh_required:
          !loaded.state.latest ||
          Date.parse(loaded.state.latest.valid_until) <= now ||
          now - Date.parse(loaded.state.last_evaluated_at ?? "1970-01-01") >=
            3600000 ||
          digest(aggregate) !==
            digest(loaded.state.learning?.model?.aggregate ?? null),
        persistence: "D1",
        mode: "fixture",
        source: "Synthetic economics; actual submitted feedback",
        live_execution: false,
      });
    }
    requireValue(
      request.method === "POST" && !path.endsWith("/audit"),
      "METHOD_NOT_ALLOWED",
      "Use GET or POST.",
      405,
    );
    checkOrigin(request, service);
    const command = envelope.parse(await readJSON(request));
    if (["optimization_prepare_draft", "wallet_prepare_checkout"].includes(command.kind)) {
      requireValue(/^[a-zA-Z0-9._:-]{8,128}$/.test(request.headers.get("idempotency-key") ?? ""), "IDEMPOTENCY_KEY", "Use a stable request key.");
      if (command.kind === "optimization_prepare_draft") {
        const p = z.object({ source_mode: z.enum(["fixture", "live"]), proposal_id: z.string().min(1).max(100) }).strict().parse(command.payload);
        await prepareOptimizationDraft({ repository, organization_id, ...p, port: draftPort });
      } else {
        const p = z.object({ intent_id: z.string().min(1).max(100) }).strict().parse(command.payload);
        await prepareWalletCheckout({ repository, organization_id, ...p, port: checkoutPort });
      }
      return respond(present(await repository.load(organization_id)));
    }
    if (["outcomes", "source_report", "optimization_register", "optimization_report", "optimization_receipt", "wallet_checkout_receipt"].includes(command.kind))
      requireValue(
        service,
        "SOURCE_AUTHORITY",
        "Only the trusted ingestion adapter may submit measured outcome records.",
        403,
      );
    if (command.kind === "product_demo") {
      return respond(present(await runProductDemo({ repository, actor_id: actor, organization_id, key: request.headers.get("idempotency-key"), payload: command.payload })));
    }
    if (command.kind === "mock_campaign") {
      z.object({}).strict().parse(command.payload);
      return respond(
        await runMockCampaignTrial({
          repository,
          actor_id: actor,
          organization_id,
          key: request.headers.get("idempotency-key"),
        }),
      );
    }
    const result = await repository.execute({
      actor_id: actor,
      organization_id,
      key: request.headers.get("idempotency-key"),
      command,
    });
    return respond(present(result));
  } catch (error) {
    return httpError(error);
  }
}

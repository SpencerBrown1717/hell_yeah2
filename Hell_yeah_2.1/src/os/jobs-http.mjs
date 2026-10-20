import { z } from "zod";
import { jobSchema } from "./job-contracts.mjs";
import { requireValue } from "./contracts.mjs";
import { checkOrigin, jsonResponse, readJSON } from "./http-boundary.mjs";
import { drainJobs } from "./job-worker.mjs";
const controls = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("drain"), payload: z.object({}).strict() }).strict(),
  z.object({ kind: z.literal("retry"), payload: z.object({ id: z.string().regex(/^[a-f0-9]{40}$/), expected_attempts: z.number().int().min(1) }).strict() }).strict(),
  z.object({ kind: z.literal("background"), payload: z.object({ enabled: z.boolean(), expected_revision: z.number().int().min(0) }).strict() }).strict(),
]);
export async function handleJobs(request, { queue, identity, service }) {
  const org = identity.organization_id;
  if (request.method === "GET") return jsonResponse(await queue.status(org));
  requireValue(request.method === "POST", "METHOD_NOT_ALLOWED", "Use GET or POST.", 405);
  checkOrigin(request, service);
  const raw = await readJSON(request);
  let accepted = null, processed = null;
  if (["retry", "background", "drain"].includes(raw?.kind)) {
    const { kind, payload: p } = controls.parse(raw);
    if (kind === "background") await queue.configure(org, p.enabled, p.expected_revision);
    if (kind === "retry") accepted = { job: await queue.retry(org, p.id, p.expected_attempts) };
    if (kind === "drain") processed = await drainJobs(queue, { organization_id: org });
  } else {
    const command = jobSchema.parse(raw);
    if (["source_batch", "optimization_batch", "optimization_register"].includes(command.kind)) requireValue(service, "SOURCE_AUTHORITY", "Only the trusted ingestion adapter may queue measured outcome reports.", 403);
    accepted = await queue.enqueue({ ...identity, key: request.headers.get("idempotency-key"), command });
  }
  return jsonResponse({ ...await queue.status(org), accepted, processed }, accepted ? 202 : 200);
}

export const workerInstructions = {
  version: 1,
  purpose: "Process already-authorized Growth OS jobs and refresh workspaces that enabled background learning.",
  access: "Retrieve this owner-private Site using Sites get_site. Send its returned service-access bearer only to this Site in OAI-Sites-Authorization. No visitor identity or app consent is supplied or assumed.",
  operation: { method: "POST", path: "/api/os/worker", body: { limit: 10 } },
  readback: "A successful response includes committed job counts. User-owned results remain in the signed-in workspace; this endpoint never returns their content.",
  retry: "One bounded drain per scheduled run. If the request is interrupted, the next run recovers expired leases. Report HTTP failures or dead-letter counts; do not bypass them.",
  constraints: ["Use existing persisted evidence only.", "Do not create sample campaigns, fake outcomes, change sharing, or change credentials.", "Do not launch ads, move funds, or certify ROI uplift."],
};
export async function handleWorker(request, { queue, service, privateWorkerEnabled }) {
  // Supported owner-private Sites update boundary. Disable before changing audience.
  // The capability can only drain previously authorized work; it cannot enqueue arbitrary commands or read tenants.
  requireValue(service || privateWorkerEnabled, "WORKER_DISABLED", "The private background worker is not enabled.", 403);
  const origin = request.headers.get("origin");
  requireValue(!origin || origin === new URL(request.url).origin, "ORIGIN_DENIED", "Cross-origin worker requests are not allowed.", 403);
  if (request.method === "GET") return jsonResponse(workerInstructions);
  requireValue(request.method === "POST", "METHOD_NOT_ALLOWED", "Use GET or POST.", 405);
  const { limit } = z.object({ limit: z.number().int().min(1).max(10).default(10) }).strict().parse(await readJSON(request));
  const scheduled = await queue.scheduleDue(limit);
  const processed = await drainJobs(queue, { limit });
  return jsonResponse({ at: queue.clock(), scheduled, ...processed, backlog: await queue.health(), live_execution: false });
}

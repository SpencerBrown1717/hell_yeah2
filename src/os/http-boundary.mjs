import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ORG, digest, validOrg, requireValue, OSError } from "./contracts.mjs";
import { readLimitedText } from "./transport.mjs";
export const jsonResponse = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
export function isService(request, key) {
  const supplied = request.headers.get("x-hy-service-key");
  return !!key && key.length >= 32 && !!supplied && timingSafeEqual(createHash("sha256").update(supplied).digest(), createHash("sha256").update(key).digest());
}
export function requestIdentity(request, service) {
  const uid = request.headers.get("oai-authenticated-user-id");
  requireValue(uid || service, "AUTH_REQUIRED", "Sign in to the private workspace to restore your account identity.", 401);
  const organization_id = uid ? `org_${digest(uid).slice(0, 32)}` : request.headers.get("x-hy-workspace") || ORG;
  requireValue(validOrg(organization_id), "ORGANIZATION_DENIED", "Workspace is invalid.", 403);
  const expected = request.headers.get("x-hy-expected-workspace");
  requireValue(!expected || expected === organization_id, "WORKSPACE_CHANGED", "Your signed-in workspace changed. Reload before submitting this update.", 409);
  return { organization_id, actor_id: uid ? `sites:${uid}` : "service:os-ingestion" };
}
export function checkOrigin(request, service = false) {
  if (!service) requireValue(request.headers.get("origin") === new URL(request.url).origin, "ORIGIN_DENIED", "A same-origin browser request is required.", 403);
}
export async function readJSON(request) {
  requireValue(request.headers.get("content-type")?.split(";")[0].trim() === "application/json", "CONTENT_TYPE", "Send JSON.");
  const text = await readLimitedText(request);
  try { return JSON.parse(text); } catch { throw new OSError("INVALID_JSON", "Malformed JSON."); }
}
export function httpError(error) {
  if (error instanceof z.ZodError) return jsonResponse({ error: "INVALID_INPUT", message: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 4).join("; ") }, 400);
  if (error instanceof OSError) return jsonResponse({ error: error.code, message: error.message }, error.status);
  console.error("OS request failed", error instanceof Error ? error.name : "UnknownError");
  return jsonResponse({ error: "SERVICE_FAILURE", message: "The OS could not complete this request. Retry with the same request key." }, 500);
}

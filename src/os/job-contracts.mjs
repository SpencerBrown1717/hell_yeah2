import { z } from "zod";
import { reportSchema } from "./adapters/report-contract.mjs";
import { optimizationReportBatch, trialDesign } from "./optimization-contracts.mjs";
import { digest, requireValue, validOrg, feedbackSchema } from "./contracts.mjs";

export const MAX_ATTEMPTS = 5;
export const LEASE_MS = 120_000;
export const REFRESH_MS = 3_600_000;
const empty = z.object({}).strict();
const cursor = z.string().min(1).max(512).nullable();
export const sourceBatchSchema = z.object({
  source: z.literal("fixture_hellyeah_google"),
  managed_account_id: z.string().startsWith("fixture_").max(100),
  expected_revision: z.number().int().min(0).max(1e9),
  from_cursor: cursor,
  next_cursor: z.string().min(1).max(512),
  reports: z.array(reportSchema).min(1).max(10),
}).strict();
export const jobSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("evaluate"), payload: empty }).strict(),
  z.object({ kind: z.literal("mock_campaign"), payload: empty }).strict(),
  z.object({ kind: z.literal("feedback_batch"), payload: z.object({ items: z.array(feedbackSchema).min(1).max(100) }).strict() }).strict(),
  z.object({ kind: z.literal("source_batch"), payload: sourceBatchSchema }).strict(),
  z.object({ kind: z.literal("optimization_register"), payload: trialDesign }).strict(),
  z.object({ kind: z.literal("optimization_batch"), payload: optimizationReportBatch }).strict(),
]);
export function validateJob({ organization_id, actor_id, key, command }, at) {
  requireValue(validOrg(organization_id), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
  requireValue(typeof actor_id === "string" && actor_id.length > 0, "AUTH_REQUIRED", "Authentication required.", 401);
  requireValue(typeof key === "string" && /^[a-zA-Z0-9._:-]{8,128}$/.test(key), "IDEMPOTENCY_KEY", "Use a stable 8–128 character request key.");
  const parsed = jobSchema.parse(command);
  requireValue(new TextEncoder().encode(JSON.stringify(parsed)).length <= 48_000, "JOB_TOO_LARGE", "Split this import into smaller batches.", 413);
  if (parsed.kind === "source_batch") {
    const p = parsed.payload;
    requireValue(p.next_cursor !== p.from_cursor, "CURSOR_NOT_ADVANCED", "A report page must advance its source cursor.");
    for (const r of p.reports) {
      requireValue(r.organization_id === organization_id && r.source === p.source && r.managed_account_id === p.managed_account_id,
        "SOURCE_SCOPE", "Every report must belong to this workspace, source and managed account.", 403);
      requireValue(Date.parse(r.period_start) < Date.parse(r.period_end) && Date.parse(r.period_end) <= Date.parse(r.observed_at) && Date.parse(r.observed_at) <= Date.parse(at),
        "REPORT_TIME", "Report timestamps are inconsistent or in the future.");
    }
  }
  if (parsed.kind === "optimization_batch" || parsed.kind === "optimization_register") {
    const reports = parsed.kind === "optimization_register" ? [parsed.payload] : parsed.payload.reports;
    for (const row of reports) requireValue(row.organization_id === organization_id, "SOURCE_SCOPE", "Learning evidence belongs to another workspace.", 403);
  }
  return {
    ...parsed,
    id: digest([organization_id, "job", key]).slice(0, 40),
    requestHash: digest({ organization_id, actor_id, command: parsed }),
    partition: parsed.kind === "source_batch" ? `source:${parsed.payload.source}:${parsed.payload.managed_account_id}` : "workspace",
  };
}
export function publicJob(row) {
  return {
    id: row.id, kind: row.kind, status: row.status,
    attempts: row.attempts, total_attempts: row.total_attempts,
    available_at: new Date(row.available_at).toISOString(),
    created_at: row.created_at, updated_at: row.updated_at,
    error_code: row.error_code,
    result: row.result_json ? JSON.parse(row.result_json) : null,
  };
}

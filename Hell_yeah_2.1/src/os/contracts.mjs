import { z } from "zod";
import { createHash } from "node:crypto";

export const ORG = "fixture_forma";
export const validOrg = (org) =>
  typeof org === "string" &&
  /^(fixture_[a-z0-9_]{1,60}|org_[a-f0-9]{32})$/.test(org);
export class OSError extends Error {
  constructor(code, message = code, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export const requireValue = (condition, code, message = code, status = 400) => {
  if (!condition) throw new OSError(code, message, status);
};
export const canonical = (v) =>
  v === null || typeof v !== "object"
    ? JSON.stringify(v)
    : Array.isArray(v)
      ? `[${v.map(canonical).join(",")}]`
      : `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
          .join(",")}}`;
export const digest = (v) =>
  createHash("sha256").update(canonical(v)).digest("hex");
export const intMoney = z.number().int().safe().min(0).max(10_000_000_000_000);
const bps = z.number().int().min(0).max(10000);
export const policySchema = z
  .object({
    monthly_cap_micros: intMoney.min(100_000_000),
    max_step_bps: z.number().int().min(0).max(2000),
    reinvest_bps: bps,
    min_roi_bps: z.number().int().min(0).max(50000),
    cash_capacity_micros: intMoney,
    inventory_capacity_micros: intMoney,
  })
  .strict();
export const feedbackSchema = z
  .object({
    source: z.enum(["customer", "product_action", "manual_import"]),
    external_id: z.string().min(1).max(128),
    category: z.enum([
      "lead_quality",
      "brand_fit",
      "budget",
      "inventory",
      "experience",
      "general",
      "recommendation",
    ]),
    polarity: z.enum(["positive", "neutral", "negative"]),
    severity: z.enum(["low", "medium", "high"]),
    text: z.string().trim().min(3).max(2000),
    campaign_id: z.enum(["c1", "c2", "c3", "c4"]).nullable().default(null),
    action: z
      .enum(["approved", "dismissed", "paused", "started", "rated"])
      .nullable()
      .default(null),
    occurred_at: z.iso.datetime().optional(),
  })
  .strict();
export const policyDefaults = {
  monthly_cap_micros: 30_000_000_000,
  max_step_bps: 1000,
  reinvest_bps: 3000,
  min_roi_bps: 2000,
  cash_capacity_micros: 5_000_000_000,
  inventory_capacity_micros: 6_000_000_000,
};
export function mulBps(value, rate) {
  const result = (BigInt(value) * BigInt(rate)) / 10000n;
  requireValue(result <= BigInt(Number.MAX_SAFE_INTEGER), "MONEY_OVERFLOW");
  return Number(result);
}
export const ratioBps = (n, d) => (d > 0 ? Math.trunc((n / d) * 10000) : null);

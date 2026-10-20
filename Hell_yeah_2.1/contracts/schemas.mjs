import { z } from 'zod';

// Canonical fixture transport. Bind production types to authoritative joint-team schemas.
const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const id = z.string().min(1);
export const campaignSchema = z.object({
  id, version: id, managed_account_id: id,
  channel: z.enum(['search', 'pmax']), goal: z.enum(['conversions', 'impressions']),
  state: z.enum(['Draft', 'In Review', 'Launching', 'Serving', 'Paused', 'Completed', 'Rejected', 'Cancelled', 'Failed']),
  currency: z.string().length(3), maximum_spend_micros: money,
  keywords_read_only: z.boolean(), keyword_plan_version: id,
});
export const fixtureSchema = z.object({
  mode: z.literal('fixture'), clock: z.iso.datetime(), organization_id: id,
  actor: z.object({ id, capabilities: z.array(id) }),
  brand: z.object({ id, version: id, complete: z.boolean(), name: id, website: z.url() }),
  studio: z.object({ id, version: id, copy_ready: z.boolean(), landscape_selected: z.boolean(), square_selected: z.boolean(), headline: id, source_region: z.tuple([z.number(),z.number(),z.number(),z.number()]) }),
  capture: z.object({ id, version: id, owned: z.boolean(), complete: z.boolean(), text: z.string(), permission: id }),
  tracker: z.object({ id, enabled: z.boolean(), receiving_events: z.boolean(), verified_internal_event: z.boolean() }),
  wallet: z.object({ available_micros: money, reserved_micros: money, spent_micros: money, pending_refund_micros: money, currency: z.string().length(3) }),
  campaign: campaignSchema,
  snapshot: z.object({ id, version: id, currency: z.string().length(3), timezone: id, impressions: z.number().int().nonnegative(), clicks: z.number().int().nonnegative(), cost_micros: money, conversions: z.number().nonnegative(), mature: z.boolean(), cutoff: z.iso.datetime() }),
  outcomes: z.object({ source: id, mature: z.boolean(), control: z.object({ assigned: z.number().int().positive(), conversions: z.number().int().nonnegative() }), treatment: z.object({ assigned: z.number().int().positive(), conversions: z.number().int().nonnegative() }) }),
});

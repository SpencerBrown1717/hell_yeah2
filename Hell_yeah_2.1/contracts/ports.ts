/** Proposed joint-build ports. These are not public Hellyeah endpoint declarations. */
export type Context = { organization_id: string; actor_id: string; trace_id: string };
export type SourceRef = { id: string; version: string; organization_id: string };
export type Money = { micros: string; currency: string };
export type CapabilityManifest = {
  adapter_version: string;
  mode: 'fixture' | 'staging' | 'live';
  organization_id: string;
  managed_account_id: string;
  search_experiments: boolean;
  pmax_experiments: boolean;
  delegated_launch: boolean;
  source_operation_lookup: boolean;
};
export interface IdentityPort { resolveOrganization(context: Context): Promise<CapabilityManifest> }
export interface BrandPort { getVersion(context: Context, ref: SourceRef): Promise<unknown> }
export interface StudioPort { snapshotSelection(context: Context, ref: SourceRef): Promise<unknown> }
export interface XRayPort {
  getTrackerHealth(context: Context): Promise<unknown>;
  readEvents(context: Context, cutoff: string): Promise<unknown>;
}
export interface WalletPort {
  getProjection(context: Context): Promise<unknown>;
  getReservation(context: Context, sourceOperationId: string): Promise<unknown>;
}
export interface CampaignPort {
  validateReadiness(context: Context, plan: unknown): Promise<unknown>;
  submit(context: Context, plan: unknown, grant: unknown, idempotencyKey: string): Promise<unknown>;
  getState(context: Context, sourceOperationId: string): Promise<unknown>;
  requestPause(context: Context, sourceOperationId: string): Promise<unknown>;
}
export interface ReviewPort { readDecision(context: Context, ref: SourceRef): Promise<unknown> }
export interface EvidencePort { scopedRead(context: Context, ref: SourceRef): Promise<unknown> }
// Replace unknown with authoritative internal source-derived request/response types
// during binding. Live transport remains intentionally unimplemented until certified.

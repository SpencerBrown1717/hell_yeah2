/** Internal integration contracts to bind jointly with Hellyeah. No public endpoint is assumed. */
import type { z } from "zod";
import type { reportSchema } from "../src/os/adapters/report-contract.mjs";
import type { proposalSchema } from "../src/os/proposals.mjs";
import type { Context, SourceRef, CapabilityManifest } from "./ports";
export type NormalizedFixtureAccountReport = z.infer<typeof reportSchema>;
export type ResearchProposal = z.infer<typeof proposalSchema>;
export interface ResearchEvidencePort {
  /** Preserve source identity and immutable snapshots. Research approval conveys no spend grant. */
  submit(
    context: Context,
    proposal: ResearchProposal,
    idempotencyKey: string,
  ): Promise<{
    operation_id: string;
    committed_revision: number;
  }>;
}
export type SourceCursor = {
  source: string;
  opaque_cursor: string | null;
  watermark: string;
};
export type OutcomeBatch = {
  reports: NormalizedFixtureAccountReport[];
  next_cursor: SourceCursor;
  complete: boolean;
};
export interface GrowthOutcomePort {
  /** Read the source-owned account-wide report, preserving refund/maturity corrections. */
  readAccountOutcomes(
    context: Context,
    account: SourceRef,
    cursor: SourceCursor,
  ): Promise<OutcomeBatch>;
}
export interface GrowthIdentityPort {
  /** Must resolve real organization membership and role grants before replacing pilot identity. */
  resolveMembership(context: Context): Promise<{
    organization_id: string;
    actor_id: string;
    capabilities: CapabilityManifest;
  }>;
}
export interface GrowthDecisionPort {
  ingestAccountReport(
    context: Context,
    report: NormalizedFixtureAccountReport,
    idempotencyKey: string,
  ): Promise<{
    operation_id: string;
    committed_revision: number;
    decision_id: string | null;
  }>;
}
export interface GrowthExecutionPort {
  /** The existing source transaction owns reservation, review and managed launch. */
  prepareReview(
    context: Context,
    decisionId: string,
    exactPlanHash: string,
  ): Promise<{ review_ref: SourceRef; state: "Draft for Hellyeah review" }>;
}
// Production reports require a separately reviewed schema version, source attestations,
// org/account mapping and calibrated marginal evidence. Renaming fixture mode is insufficient.

/** Durable ingestion is separate from applying a report to the decision model. */
export type DurableSourceBatch = import("zod").z.infer<
  typeof import("../src/os/job-contracts.mjs").sourceBatchSchema
>;
export interface GrowthIngestionPort {
  readCursor(context: Context, account: SourceRef): Promise<{
    received_cursor: string | null;
    received_revision: number;
    applied_cursor: string | null;
    applied_revision: number;
  }>;
  /** Accept only after the immutable batch and received cursor commit together. */
  acceptBatch(context: Context, batch: DurableSourceBatch, idempotencyKey: string): Promise<{
    job_id: string;
    status: "queued" | "running" | "succeeded" | "dead_letter";
    replayed: boolean;
  }>;
}
export interface GrowthWorkerPort {
  /** No visitor identity, measured facts or spend permission is granted by a worker tick. */
  drain(limit: number): Promise<{
    claimed: number;
    succeeded: number;
    retrying: number;
    dead_letter: number;
    lease_lost: number;
  }>;
}

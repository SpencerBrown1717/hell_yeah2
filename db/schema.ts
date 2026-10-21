import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const osWorkspaces = sqliteTable("os_workspaces", {
  organizationId: text("organization_id").primaryKey(),
  revision: integer("revision").notNull(),
  stateJson: text("state_json").notNull(),
  lastOperation: text("last_operation").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const osOperations = sqliteTable(
  "os_operations",
  {
    organizationId: text("organization_id").notNull(),
    operationKey: text("operation_key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseJson: text("response_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.operationKey] })],
);
export const osAudit = sqliteTable(
  "os_audit",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    operationKey: text("operation_key").notNull(),
    actorId: text("actor_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("os_audit_org_time").on(t.organizationId, t.createdAt)],
);
export const osCohortContributions = sqliteTable(
  "os_cohort_contributions",
  {
    organizationId: text("organization_id").primaryKey(),
    cohort: text("cohort").notNull(),
    sourceMode: text("source_mode").notNull(),
    eligible: integer("eligible").notNull(),
    qualified: integer("qualified").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("os_cohort_scope_time").on(t.cohort, t.sourceMode, t.updatedAt)],
);

// Durable delivery is separate from the bounded decision workspace.
export const osJobs = sqliteTable("os_jobs", {
  sequence: integer("sequence").primaryKey({ autoIncrement: true }),
  id: text("id").notNull(),
  organizationId: text("organization_id").notNull(),
  partitionKey: text("partition_key").notNull(),
  requestKey: text("request_key").notNull(),
  requestHash: text("request_hash").notNull(),
  actorId: text("actor_id").notNull(),
  kind: text("kind").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull(),
  attempts: integer("attempts").notNull().default(0),
  totalAttempts: integer("total_attempts").notNull().default(0),
  availableAt: integer("available_at").notNull(),
  leaseToken: text("lease_token"),
  leaseUntil: integer("lease_until"),
  errorCode: text("error_code"),
  resultJson: text("result_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [
  uniqueIndex("os_jobs_id").on(t.id),
  uniqueIndex("os_jobs_request").on(t.organizationId, t.requestKey),
  index("os_jobs_ready").on(t.status, t.availableAt, t.sequence),
  index("os_jobs_lease").on(t.status, t.leaseUntil),
  index("os_jobs_partition").on(t.organizationId, t.partitionKey, t.sequence, t.status),
  index("os_jobs_org").on(t.organizationId, t.sequence),
]);

export const osSourceCursors = sqliteTable("os_source_cursors", {
  organizationId: text("organization_id").notNull(),
  source: text("source").notNull(),
  managedAccountId: text("managed_account_id").notNull(),
  receivedCursor: text("received_cursor"),
  receivedRevision: integer("received_revision").notNull().default(0),
  appliedCursor: text("applied_cursor"),
  appliedRevision: integer("applied_revision").notNull().default(0),
  lastJobId: text("last_job_id"),
  updatedAt: text("updated_at").notNull(),
}, (t) => [primaryKey({ columns: [t.organizationId, t.source, t.managedAccountId] })]);

export const osBackgroundSettings = sqliteTable("os_background_settings", {
  organizationId: text("organization_id").primaryKey(),
  enabled: integer("enabled").notNull().default(0),
  revision: integer("revision").notNull().default(0),
  nextRunAt: integer("next_run_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [index("os_background_due").on(t.enabled, t.nextRunAt)]);

export const osStrategyContributions = sqliteTable("os_strategy_contributions", {
  organizationId: text("organization_id").notNull(),
  sourceMode: text("source_mode").notNull(),
  cohort: text("cohort").notNull(),
  strategy: text("strategy").notNull(),
  controlQ: integer("control_q").notNull(),
  candidateQ: integer("candidate_q").notNull(),
  observedAt: text("observed_at").notNull(),
}, t => [
  primaryKey({ columns: [t.organizationId, t.sourceMode, t.strategy] }),
  index("os_strategy_cohort_time").on(t.sourceMode, t.cohort, t.observedAt, t.strategy),
]);

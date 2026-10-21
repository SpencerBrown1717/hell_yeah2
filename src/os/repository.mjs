import { randomUUID } from "node:crypto";
import { contributionFor, releaseCohort, COHORT } from "./learning.mjs";
import { strategyContributions, releaseStrategyCohort } from "./optimization-learning.mjs";
import { cohortKey } from "./optimization-contracts.mjs";
import { runOptimizationLearning } from "./optimization-workflow.mjs";
import {
  ORG,
  initialOS,
  applyCommand,
  digest,
  requireValue,
  OSError,
  validOrg,
} from "./kernel.mjs";
export class OSRepository {
  constructor(db, { evaluate, clock = () => new Date().toISOString() }) {
    this.db = db;
    this.evaluate = evaluate;
    this.clock = clock;
  }
  q(sql, ...values) {
    return this.db.prepare(sql).bind(...values);
  }
  async load(org = ORG) {
    requireValue(
      validOrg(org),
      "ORGANIZATION_DENIED",
      "Wrong organization.",
      403,
    );
    const row = await this.q(
      "SELECT revision,state_json FROM os_workspaces WHERE organization_id=?",
      org,
    ).first();
    if (row)
      return { revision: row.revision, state: JSON.parse(row.state_json) };
    return { revision: 0, state: initialOS(this.clock(), org) };
  }
  async ensureWorkspace(org) {
    requireValue(validOrg(org), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
    const at = this.clock();
    await this.q(
      "INSERT OR IGNORE INTO os_workspaces(organization_id,revision,state_json,last_operation,updated_at) VALUES(?,0,?,?,?)",
      org,
      JSON.stringify(initialOS(at, org)),
      "seed",
      at,
    ).run();
    return this.load(org);
  }
  async operation(org, key, command, actor_id) {
    requireValue(validOrg(org), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
    const prior = await this.q(
      "SELECT request_hash,response_json FROM os_operations WHERE organization_id=? AND operation_key=?",
      org,
      key,
    ).first();
    if (!prior) return null;
    requireValue(
      prior.request_hash ===
        digest({ actor_id, organization_id: org, command }),
      "IDEMPOTENCY_CONFLICT",
      "Request key already has a different payload.",
      409,
    );
    return this.hydrateReceipt(prior.response_json, org, true);
  }
  async execute({
    actor_id,
    organization_id = ORG,
    key,
    command,
    requestIdentity = command,
  }) {
    requireValue(
      validOrg(organization_id),
      "ORGANIZATION_DENIED",
      "Wrong organization.",
      403,
    );
    requireValue(
      typeof actor_id === "string" && actor_id.length > 0,
      "AUTH_REQUIRED",
      "Authentication required.",
      401,
    );
    requireValue(
      typeof key === "string" && /^[a-zA-Z0-9._:-]{8,128}$/.test(key),
      "IDEMPOTENCY_KEY",
      "Use an 8–128 character idempotency key.",
    );
    const requestHash = digest({
      actor_id,
      organization_id,
      command: requestIdentity,
    });
    const prior = await this.q(
      "SELECT request_hash,response_json FROM os_operations WHERE organization_id=? AND operation_key=?",
      organization_id,
      key,
    ).first();
    if (prior) {
      requireValue(
        prior.request_hash === requestHash,
        "IDEMPOTENCY_CONFLICT",
        "This request key already has a different payload.",
        409,
      );
      return this.hydrateReceipt(prior.response_json, organization_id, true);
    }
    const now = this.clock();
    await this.q(
      "INSERT OR IGNORE INTO os_workspaces(organization_id,revision,state_json,last_operation,updated_at) VALUES(?,0,?,?,?)",
      organization_id,
      JSON.stringify(initialOS(now, organization_id)),
      "seed",
      now,
    ).run();
    for (let attempt = 0; attempt < 3; attempt++) {
      const retryPrior = await this.q(
        "SELECT request_hash,response_json FROM os_operations WHERE organization_id=? AND operation_key=?",
        organization_id,
        key,
      ).first();
      if (retryPrior) {
        requireValue(
          retryPrior.request_hash === requestHash,
          "IDEMPOTENCY_CONFLICT",
          "Request key conflict.",
          409,
        );
        return this.hydrateReceipt(
          retryPrior.response_json,
          organization_id,
          true,
        );
      }
      const current = await this.load(organization_id),
        state = structuredClone(current.state),
        operation_id = digest([organization_id, key]).slice(0, 32),
        context = { at: now, actor_id, organization_id, operation_id };
      const commitToken = randomUUID();
      // An approval uses freshly evaluated evidence, including revoked network consent.
      if (command.kind === "optimization_propose") await this.refreshOptimization(state, now);
      const changed = applyCommand(state, command, context);
      if (state.optimization && (changed.optimization || changed.reevaluate)) {
        await this.refreshOptimization(state, now);
        changed.events.push({ type: "optimization.evaluated", data: Object.fromEntries(Object.entries(state.optimization).map(([mode,c]) => [mode, { input_hash: c.model.input_hash, evidence_version: c.evidence_version, eligible_strategies: c.model.eligible_strategies }])) });
      }
      if (changed.reevaluate) {
        context.aggregate = await this.cohort(organization_id, now);
        const decision = await this.evaluate(state, context);
        if (decision.learning) {
          state.learning.model = decision.learning;
          state.learning.updated_at = now;
        }
        state.decisions.unshift(decision);
        state.decisions = state.decisions.slice(0, 50);
        state.latest = decision;
        state.last_evaluated_at = now;
        changed.events.push({ type: "decision.evaluated", data: decision });
      }
      const revision = current.revision + 1,
        response = { revision, state, operation_id, replayed: false };
      const receipt = {
        operation_id,
        committed_revision: revision,
        decision_id: state.latest?.id ?? null,
        committed_at: now,
      };
      requireValue(
        new TextEncoder().encode(JSON.stringify(response)).length < 1_500_000,
        "PILOT_STORAGE_LIMIT",
        "The pilot workspace reached its storage envelope. Export evidence and extend retention before more ingestion.",
        409,
      );
      const statements = [
        this.q(
          "UPDATE os_workspaces SET state_json=?,revision=?,last_operation=?,updated_at=? WHERE organization_id=? AND revision=? AND NOT EXISTS(SELECT 1 FROM os_operations WHERE organization_id=? AND operation_key=?)",
          JSON.stringify(state),
          revision,
          commitToken,
          now,
          organization_id,
          current.revision,
          organization_id,
          key,
        ),
      ];
      const contribution = contributionFor(state, now);
      if (state.optimization) {
        const fence = "EXISTS(SELECT 1 FROM os_workspaces WHERE organization_id=? AND revision=? AND last_operation=?)";
        statements.push(this.q("DELETE FROM os_strategy_contributions WHERE organization_id=? AND " + fence,
          organization_id, organization_id, revision, commitToken));
        for (const c of Object.values(state.optimization)) for (const x of strategyContributions(c, now))
          statements.push(this.q("INSERT INTO os_strategy_contributions(organization_id,source_mode,cohort,strategy,control_q,candidate_q,observed_at) SELECT ?,?,?,?,?,?,? WHERE " + fence,
            organization_id, x.source_mode, x.cohort, x.strategy, x.control_q, x.candidate_q, x.observed_at,
            organization_id, revision, commitToken));
      }
      if (contribution)
        statements.push(
          this.q(
            "INSERT INTO os_cohort_contributions(organization_id,cohort,source_mode,eligible,qualified,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM os_workspaces WHERE organization_id=? AND revision=? AND last_operation=?) ON CONFLICT(organization_id) DO UPDATE SET cohort=excluded.cohort,source_mode=excluded.source_mode,eligible=excluded.eligible,qualified=excluded.qualified,updated_at=excluded.updated_at",
            organization_id,
            contribution.cohort,
            contribution.source_mode,
            contribution.eligible,
            contribution.qualified,
            now,
            organization_id,
            revision,
            commitToken,
          ),
        );
      else
        statements.push(
          this.q(
            "DELETE FROM os_cohort_contributions WHERE organization_id=? AND EXISTS(SELECT 1 FROM os_workspaces WHERE organization_id=? AND revision=? AND last_operation=?)",
            organization_id,
            organization_id,
            revision,
            commitToken,
          ),
        );
      for (let i = 0; i < changed.events.length; i++) {
        const e = changed.events[i];
        statements.push(
          this.q(
            "INSERT OR IGNORE INTO os_audit(id,organization_id,operation_key,actor_id,event_type,payload_json,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM os_workspaces WHERE organization_id=? AND revision=? AND last_operation=?)",
            `${operation_id}:${i}`,
            organization_id,
            key,
            actor_id,
            e.type,
            JSON.stringify(e.data),
            now,
            organization_id,
            revision,
            commitToken,
          ),
        );
      }
      statements.push(
        this.q(
          "INSERT OR IGNORE INTO os_operations(organization_id,operation_key,request_hash,response_json,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM os_workspaces WHERE organization_id=? AND revision=? AND last_operation=?)",
          organization_id,
          key,
          requestHash,
          JSON.stringify(receipt),
          now,
          organization_id,
          revision,
          commitToken,
        ),
      );
      const result = await this.db.batch(statements);
      const committed = await this.q(
        "SELECT request_hash,response_json FROM os_operations WHERE organization_id=? AND operation_key=?",
        organization_id,
        key,
      ).first();
      if (committed) {
        requireValue(
          committed.request_hash === requestHash,
          "IDEMPOTENCY_CONFLICT",
          "This request key already has a different payload.",
          409,
        );
        return this.hydrateReceipt(
          committed.response_json,
          organization_id,
          !(result[0].meta?.changes > 0),
        );
      }
    }
    throw new OSError(
      "CONCURRENT_UPDATE",
      "Workspace changed repeatedly. Retry with the same request key.",
      409,
    );
  }
  async hydrateReceipt(json, org, replayed) {
    const saved = JSON.parse(json);
    const receipt =
      saved.committed_revision !== undefined
        ? saved
        : {
            operation_id: saved.operation_id,
            committed_revision: saved.revision,
            decision_id: saved.state?.latest?.id ?? null,
          };
    return {
      ...(await this.load(org)),
      operation_id: receipt.operation_id,
      receipt,
      replayed,
    };
  }
  async cohort(org, at = this.clock()) {
    const cutoff = new Date(Date.parse(at) - 7 * 864e5).toISOString();
    const summary = await this.q(
      "SELECT COUNT(*) AS participants,COALESCE(SUM(qualified),0) AS qualified FROM os_cohort_contributions WHERE organization_id<>? AND cohort=? AND source_mode='fixture' AND updated_at>=? AND updated_at<=?",
      org,
      COHORT,
      cutoff,
      at,
    ).first();
    return releaseCohort(summary);
  }
  async strategyCohort(org, config, at = this.clock()) {
    if (!config.share_learning || !config.enabled) return releaseStrategyCohort([]);
    const cutoff = new Date(Date.parse(at) - 90 * 864e5).toISOString();
    const rows = await this.q(
      "SELECT strategy,COUNT(*) AS participants,SUM(control_q) AS control_q,SUM(candidate_q) AS candidate_q FROM os_strategy_contributions WHERE organization_id<>? AND source_mode=? AND cohort=? AND observed_at>=? AND observed_at<=? GROUP BY strategy",
      org, config.source_mode, cohortKey(config), cutoff, at,
    ).all();
    return releaseStrategyCohort(rows.results);
  }
  async refreshOptimization(state, at = this.clock()) {
    for (const c of Object.values(state.optimization ?? {})) {
      const aggregate = await this.strategyCohort(state.organization_id, c.config, at);
      c.model = await runOptimizationLearning({ context: c, aggregate, feedback: state.feedback, at });
    }
  }
  async audit(org = ORG) {
    requireValue(validOrg(org), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
    const r = await this.q(
      "SELECT id,event_type,actor_id,created_at FROM os_audit WHERE organization_id=? ORDER BY created_at DESC,id DESC LIMIT 100",
      org,
    ).all();
    return r.results;
  }
}

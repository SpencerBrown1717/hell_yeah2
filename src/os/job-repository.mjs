import { randomUUID } from "node:crypto";
import { OSError, requireValue, validOrg } from "./contracts.mjs";
import { MAX_ATTEMPTS, LEASE_MS, REFRESH_MS, validateJob, publicJob } from "./job-contracts.mjs";

/** D1-backed, ordered, at-least-once delivery. Business effects use OS receipts. */
export class OSJobRepository {
  constructor(repository) {
    this.repository = repository;
    this.db = repository.db;
    this.clock = () => repository.clock();
  }
  q(sql, ...values) { return this.db.prepare(sql).bind(...values); }
  async find(org, key) {
    return this.q("SELECT * FROM os_jobs WHERE organization_id=? AND request_key=?", org, key).first();
  }
  async enqueue(input) {
    const at = this.clock(), now = Date.parse(at);
    const j = validateJob(input, at), { organization_id: org, actor_id: actor, key } = input;
    const prior = await this.find(org, key);
    if (prior) return this.replay(prior, j.requestHash);
    const args = [j.id, org, j.partition, key, j.requestHash, actor, j.kind, JSON.stringify(j.payload), now, at, at, org];
    const insert = "INSERT OR IGNORE INTO os_jobs(id,organization_id,partition_key,request_key,request_hash,actor_id,kind,payload_json,status,available_at,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,'queued',?,?,? WHERE (SELECT COUNT(*) FROM os_jobs WHERE organization_id=? AND status<>'succeeded')<200";
    if (j.kind === "source_batch") {
      const p = j.payload;
      await this.db.batch([
        this.q("INSERT OR IGNORE INTO os_source_cursors(organization_id,source,managed_account_id,updated_at) VALUES(?,?,?,?)", org, p.source, p.managed_account_id, at),
        this.q(`${insert} AND EXISTS(SELECT 1 FROM os_source_cursors WHERE organization_id=? AND source=? AND managed_account_id=? AND received_revision=? AND received_cursor IS ?)`,
          ...args, org, p.source, p.managed_account_id, p.expected_revision, p.from_cursor),
        this.q("UPDATE os_source_cursors SET received_cursor=?,received_revision=received_revision+1,last_job_id=?,updated_at=? WHERE organization_id=? AND source=? AND managed_account_id=? AND received_revision=? AND received_cursor IS ? AND EXISTS(SELECT 1 FROM os_jobs WHERE id=? AND request_hash=?)",
          p.next_cursor, j.id, at, org, p.source, p.managed_account_id, p.expected_revision, p.from_cursor, j.id, j.requestHash),
      ]);
    } else {
      await this.q(insert, ...args).run();
    }
    const saved = await this.find(org, key);
    if (!saved) {
      const active = await this.q("SELECT COUNT(*) n FROM os_jobs WHERE organization_id=? AND status<>'succeeded'", org).first();
      requireValue(active.n < 200, "QUEUE_CAPACITY", "This workspace has 200 outstanding jobs. Process or resolve them before importing more.", 429);
    }
    requireValue(saved, "CURSOR_CONFLICT", "The accepted source cursor changed. Read it again before importing another page.", 409);
    requireValue(saved.request_hash === j.requestHash, "IDEMPOTENCY_CONFLICT", "This job request key already has a different payload.", 409);
    return { job: publicJob(saved), replayed: false };
  }
  replay(row, hash) {
    requireValue(row.request_hash === hash, "IDEMPOTENCY_CONFLICT", "This job request key already has a different payload.", 409);
    return { job: publicJob(row), replayed: true };
  }
  async cursor(org, source, account) {
    requireValue(validOrg(org), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
    return await this.q("SELECT received_cursor,received_revision,applied_cursor,applied_revision FROM os_source_cursors WHERE organization_id=? AND source=? AND managed_account_id=?", org, source, account).first()
      ?? { received_cursor: null, received_revision: 0, applied_cursor: null, applied_revision: 0 };
  }
  async claim(org = null) {
    if (org !== null) requireValue(validOrg(org), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
    const at = this.clock(), now = Date.parse(at), token = randomUUID();
    // The final abandoned attempt must become visible, not remain "running" forever.
    await this.q("UPDATE os_jobs SET status='dead_letter',error_code='LEASE_EXHAUSTED',lease_token=NULL,lease_until=NULL,updated_at=? WHERE status='running' AND lease_until<=? AND attempts>=? AND (? IS NULL OR organization_id=?)", at, now, MAX_ATTEMPTS, org, org).run();
    return this.q(`UPDATE os_jobs SET status='running',attempts=attempts+1,total_attempts=total_attempts+1,lease_token=?,lease_until=?,updated_at=?
      WHERE sequence=(SELECT j.sequence FROM os_jobs j
        WHERE ((j.status='queued' AND j.available_at<=?) OR (j.status='running' AND j.lease_until<=?))
        AND j.attempts<? AND (? IS NULL OR j.organization_id=?)
        AND NOT EXISTS(SELECT 1 FROM os_jobs older WHERE older.organization_id=j.organization_id AND older.partition_key=j.partition_key AND older.sequence<j.sequence AND older.status<>'succeeded')
        ORDER BY j.sequence LIMIT 1) RETURNING *`, token, now + LEASE_MS, at, now, now, MAX_ATTEMPTS, org, org).first();
  }
  async owns(job) {
    return !!await this.q("SELECT id FROM os_jobs WHERE id=? AND status='running' AND lease_token=? AND lease_until>?", job.id, job.lease_token, Date.parse(this.clock())).first();
  }
  async finish(job, result) {
    const at = this.clock(), now = Date.parse(at), p = JSON.parse(job.payload_json);
    let sql = "UPDATE os_jobs SET status='succeeded',result_json=?,error_code=NULL,lease_until=NULL,updated_at=? WHERE id=? AND status='running' AND lease_token=? AND lease_until>?";
    const args = [JSON.stringify(result), at, job.id, job.lease_token, now];
    if (job.kind === "source_batch") {
      sql += " AND EXISTS(SELECT 1 FROM os_source_cursors WHERE organization_id=? AND source=? AND managed_account_id=? AND applied_revision=? AND applied_cursor IS ?)";
      args.push(job.organization_id, p.source, p.managed_account_id, p.expected_revision, p.from_cursor);
    }
    const statements = [this.q(sql, ...args)];
    if (job.kind === "source_batch") statements.push(this.q(
      "UPDATE os_source_cursors SET applied_cursor=?,applied_revision=?,updated_at=? WHERE organization_id=? AND source=? AND managed_account_id=? AND applied_revision=? AND applied_cursor IS ? AND EXISTS(SELECT 1 FROM os_jobs WHERE id=? AND status='succeeded' AND lease_token=?)",
      p.next_cursor, p.expected_revision + 1, at, job.organization_id, p.source, p.managed_account_id, p.expected_revision, p.from_cursor, job.id, job.lease_token));
    const [changed] = await this.db.batch(statements);
    requireValue(changed.meta?.changes === 1, "LEASE_LOST", "Another worker owns this job, or its source checkpoint requires repair.", 409);
  }
  async fail(job, error) {
    const at = this.clock(), now = Date.parse(at);
    const retryable = !(error instanceof OSError) || error.code === "CONCURRENT_UPDATE" || error.status >= 500;
    const exhausted = job.attempts >= MAX_ATTEMPTS;
    const candidate = error?.name === "ZodError" ? "INVALID_JOB" : error instanceof OSError ? error.code : "WORKER_FAILURE";
    const code = /^[A-Z0-9_]{1,64}$/.test(candidate) ? candidate : "WORKER_FAILURE";
    const status = retryable && error?.name !== "ZodError" && !exhausted ? "queued" : "dead_letter";
    const changed = await this.q("UPDATE os_jobs SET status=?,available_at=?,error_code=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND status='running' AND lease_token=? AND lease_until>?",
      status, now + Math.min(3_600_000, 60_000 * 2 ** (job.attempts - 1)), code, at, job.id, job.lease_token, now).run();
    return changed.meta?.changes === 1 ? status : "lease_lost";
  }
  async retry(org, id, expectedAttempts) {
    requireValue(validOrg(org), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
    const at = this.clock();
    const result = await this.q("UPDATE os_jobs SET status='queued',attempts=0,available_at=?,error_code=NULL,updated_at=? WHERE organization_id=? AND id=? AND status='dead_letter' AND total_attempts=?",
      Date.parse(at), at, org, id, expectedAttempts).run();
    const row = await this.q("SELECT * FROM os_jobs WHERE organization_id=? AND id=?", org, id).first();
    requireValue(row, "JOB_NOT_FOUND", "Job not found in this workspace.", 404);
    requireValue(result.meta?.changes > 0 || (row.status === "queued" && row.total_attempts === expectedAttempts), "JOB_CHANGED", "This job changed. Refresh before retrying it.", 409);
    return publicJob(row);
  }
  async configure(org, enabled, expectedRevision) {
    requireValue(validOrg(org), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
    const at = this.clock(), now = Date.parse(at);
    await this.repository.ensureWorkspace(org);
    const changes = await this.db.batch([
      this.q("INSERT OR IGNORE INTO os_background_settings(organization_id,next_run_at,updated_at) VALUES(?,?,?)", org, now, at),
      this.q("UPDATE os_background_settings SET enabled=?,revision=revision+1,next_run_at=?,updated_at=? WHERE organization_id=? AND revision=?", enabled ? 1 : 0, now, at, org, expectedRevision),
    ]);
    requireValue(changes[1].meta?.changes > 0, "SETTINGS_CHANGED", "Background settings changed. Refresh before updating them.", 409);
  }
  async scheduleDue(limit = 10) {
    requireValue(Number.isInteger(limit) && limit >= 1 && limit <= 10, "WORKER_LIMIT", "Schedule between 1 and 10 workspaces.");
    const at = this.clock(), now = Date.parse(at);
    const due = (await this.q("SELECT organization_id,next_run_at,revision FROM os_background_settings WHERE enabled=1 AND next_run_at<=? ORDER BY next_run_at,organization_id LIMIT ?", now, limit).all()).results;
    let scheduled = 0;
    for (const row of due) {
      const org = row.organization_id, key = `refresh:${row.revision}:${row.next_run_at}`, command = { kind: "evaluate", payload: {} }, actor = "service:background-refresh";
      const j = validateJob({ organization_id: org, actor_id: actor, key, command }, at);
      const result = await this.db.batch([
        this.q("INSERT OR IGNORE INTO os_jobs(id,organization_id,partition_key,request_key,request_hash,actor_id,kind,payload_json,status,available_at,created_at,updated_at) SELECT ?,?,'workspace',?,?,?,'evaluate','{}','queued',?,?,? WHERE EXISTS(SELECT 1 FROM os_background_settings WHERE organization_id=? AND enabled=1 AND revision=? AND next_run_at=?) AND NOT EXISTS(SELECT 1 FROM os_jobs WHERE organization_id=? AND kind='evaluate' AND status<>'succeeded') AND (SELECT COUNT(*) FROM os_jobs WHERE organization_id=? AND status<>'succeeded')<200",
          j.id, org, key, j.requestHash, actor, now, at, at, org, row.revision, row.next_run_at, org, org),
        this.q("UPDATE os_background_settings SET next_run_at=?,updated_at=? WHERE organization_id=? AND enabled=1 AND revision=? AND next_run_at=?", (Math.floor(now / REFRESH_MS) + 1) * REFRESH_MS, at, org, row.revision, row.next_run_at),
      ]);
      scheduled += result[0].meta?.changes ?? 0;
    }
    return scheduled;
  }
  async health() {
    const rows = (await this.q("SELECT status,COUNT(*) AS count FROM os_jobs GROUP BY status").all()).results;
    return Object.fromEntries(["queued", "running", "succeeded", "dead_letter"].map((status) => [status, rows.find((r) => r.status === status)?.count ?? 0]));
  }
  async status(org) {
    requireValue(validOrg(org), "ORGANIZATION_DENIED", "Wrong workspace.", 403);
    const [jobs, counts, cursors, settings] = await Promise.all([
      this.q("SELECT id,kind,status,attempts,total_attempts,available_at,error_code,result_json,created_at,updated_at FROM os_jobs WHERE organization_id=? ORDER BY sequence DESC LIMIT 20", org).all(),
      this.q("SELECT status,COUNT(*) AS count FROM os_jobs WHERE organization_id=? GROUP BY status", org).all(),
      this.q("SELECT source,managed_account_id,received_revision,applied_revision,updated_at FROM os_source_cursors WHERE organization_id=? ORDER BY updated_at DESC LIMIT 20", org).all(),
      this.q("SELECT enabled,revision,next_run_at FROM os_background_settings WHERE organization_id=?", org).first(),
    ]);
    return {
      organization_id: org,
      jobs: jobs.results.map(publicJob),
      counts: Object.fromEntries(["queued", "running", "succeeded", "dead_letter"].map((s) => [s, counts.results.find((r) => r.status === s)?.count ?? 0])),
      cursors: cursors.results,
      background: { enabled: !!settings?.enabled, revision: settings?.revision ?? 0, next_run_at: settings?.enabled ? new Date(settings.next_run_at).toISOString() : null },
    };
  }
}

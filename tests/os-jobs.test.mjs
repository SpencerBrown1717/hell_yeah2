import test from "node:test";
import assert from "node:assert/strict";
import { sqliteD1 } from "./helpers/sqlite-d1.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { OSJobRepository } from "../src/os/job-repository.mjs";
import { processJob, drainJobs } from "../src/os/job-worker.mjs";
import { MAX_ATTEMPTS, LEASE_MS } from "../src/os/job-contracts.mjs";
import { runGrowthLearning } from "../src/os/workflow.mjs";
import { MockGoogleCampaign } from "../src/os/adapters/mock-google.mjs";
import { handleOS } from "../src/os/http.mjs";
import { ORG, OSError } from "../src/os/contracts.mjs";
const start = "2026-10-19T00:00:00.000Z";
function setup(t) {
  const db = sqliteD1();
  t.after(() => db.close());
  let now = Date.parse(start);
  const repo = new OSRepository(db, { evaluate: runGrowthLearning, clock: () => new Date(now).toISOString() });
  const queue = new OSJobRepository(repo);
  const input = (key, command = { kind: "evaluate", payload: {} }, org = ORG) => ({ key, command, organization_id: org, actor_id: "test:owner" });
  const enqueue = (key, command, org) => queue.enqueue(input(key, command, org));
  const campaign = new MockGoogleCampaign({ organization_id: ORG, at: start });
  campaign.submit("job-test-launch"); campaign.serve("job-test-launch");
  const report = (revision, quality = "healthy") => campaign.report({ revision, quality });
  const batch = (reports, revision = 0, from = null, next = "page-1") => ({ kind: "source_batch", payload: { source: "fixture_hellyeah_google", managed_account_id: reports[0].managed_account_id, expected_revision: revision, from_cursor: from, next_cursor: next, reports } });
  const cursor = () => queue.cursor(ORG, "fixture_hellyeah_google", report(1).managed_account_id);
  return { db, repo, queue, input, enqueue, report, batch, cursor, tick: (ms) => { now += ms; } };
}

test("a report page and received cursor commit atomically and conflicting retries cannot replace it", async (t) => {
  const h = setup(t), command = h.batch([h.report(1)]);
  const first = await h.enqueue("source-page-01", command);
  assert.equal((await h.cursor()).received_revision, 1);
  assert.equal((await h.cursor()).applied_revision, 0);
  assert.equal((await h.repo.load()).revision, 0);
  const again = await h.enqueue("source-page-01", command);
  assert.equal(again.replayed, true); assert.equal(again.job.id, first.job.id);
  await assert.rejects(h.enqueue("source-page-01", h.batch([h.report(2, "poor")])), { code: "IDEMPOTENCY_CONFLICT" });
  await assert.rejects(h.enqueue("source-page-02", command), { code: "CURSOR_CONFLICT" });
  assert.equal((await h.queue.status(ORG)).counts.queued, 1);
});

test("cursor transaction rollback leaves neither an orphan job nor an advanced checkpoint", async (t) => {
  const h = setup(t), batch = h.db.batch;
  h.db.batch = (statements) => batch([...statements, h.db.prepare("INSERT INTO os_workspaces(organization_id) VALUES(?)").bind("invalid")]);
  await assert.rejects(h.enqueue("rollback-page", h.batch([h.report(1)])));
  assert.equal(h.db.sqlite.prepare("SELECT COUNT(*) n FROM os_jobs").get().n, 0);
  assert.equal(h.db.sqlite.prepare("SELECT COUNT(*) n FROM os_source_cursors").get().n, 0);
});

test("racing source pages accept only one cursor successor", async (t) => {
  const h = setup(t);
  const results = await Promise.allSettled([
    h.enqueue("race-page-a", h.batch([h.report(1)], 0, null, "a")),
    h.enqueue("race-page-b", h.batch([h.report(1)], 0, null, "b")),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await h.cursor()).received_revision, 1);
  assert.equal((await h.queue.status(ORG)).counts.queued, 1);
});

test("healthy source data and its correction reach Mastra in order with one active fact", async (t) => {
  const h = setup(t);
  await h.enqueue("healthy-page", h.batch([h.report(1)]));
  await h.enqueue("corrected-page", h.batch([h.report(2, "poor")], 1, "page-1", "page-2"));
  assert.equal((await drainJobs(h.queue, { limit: 1 })).succeeded, 1);
  assert.equal((await h.repo.load()).state.latest.chosen.increment_micros, 2_000_000_000);
  assert.equal((await h.cursor()).applied_revision, 1);
  assert.equal((await drainJobs(h.queue)).succeeded, 1);
  const s = (await h.repo.load()).state;
  assert.equal(s.latest.chosen.increment_micros, 0);
  assert.equal(s.learning.observations.filter((r) => !r.superseded).length, 1);
  assert.equal((await h.cursor()).applied_cursor, "page-2");
});

test("crash after model commit before job acknowledgement replays without duplicate effects", async (t) => {
  const h = setup(t);
  await h.enqueue("interrupted-page", h.batch([h.report(1)]));
  const lost = await h.queue.claim();
  await processJob(h.queue, lost); // Commit OS receipt, then lose the process before finish.
  const before = await h.repo.load(), audits = (await h.repo.audit()).length;
  assert.equal((await h.cursor()).applied_revision, 0);
  assert.equal(await h.queue.claim(), null);
  h.tick(LEASE_MS + 1);
  const restarted = new OSJobRepository(h.repo);
  assert.equal((await drainJobs(restarted)).succeeded, 1);
  assert.equal((await h.repo.load()).revision, before.revision);
  assert.equal((await h.repo.audit()).length, audits);
  assert.equal((await h.cursor()).applied_revision, 1);
  assert.equal((await h.queue.status(ORG)).jobs[0].total_attempts, 2);
});

test("a partial multi-report batch resumes committed steps and holds the applied cursor", async (t) => {
  const h = setup(t);
  await h.enqueue("partial-page", h.batch([h.report(1), h.report(2, "poor")]));
  const execute = h.repo.execute.bind(h.repo);
  let interrupted = false;
  h.repo.execute = async (input) => {
    if (input.command.payload.source_revision === 2 && !interrupted) { interrupted = true; throw new Error("upstream timeout must not be stored"); }
    return execute(input);
  };
  const first = await drainJobs(h.queue);
  assert.equal(first.retrying, 1); assert.equal((await h.cursor()).applied_revision, 0);
  assert.equal((await h.repo.load()).revision, 1);
  const status = await h.queue.status(ORG);
  assert.equal(status.jobs[0].error_code, "WORKER_FAILURE");
  assert.ok(!JSON.stringify(status).includes("upstream"));
  assert.equal((await drainJobs(h.queue)).claimed, 0);
  h.tick(60_001);
  assert.equal((await drainJobs(h.queue)).succeeded, 1);
  assert.equal((await h.repo.load()).revision, 2);
  assert.equal((await h.cursor()).applied_revision, 1);
});

test("parallel workers claim one attempt and stale lease owners cannot acknowledge or fail it", async (t) => {
  const h = setup(t); await h.enqueue("lease-fencing");
  const claims = await Promise.all([h.queue.claim(), h.queue.claim()]);
  assert.equal(claims.filter(Boolean).length, 1);
  const old = claims.find(Boolean);
  h.tick(LEASE_MS + 1);
  const current = await h.queue.claim();
  assert.notEqual(old.lease_token, current.lease_token);
  await assert.rejects(h.queue.finish(old, {}), { code: "LEASE_LOST" });
  assert.equal(await h.queue.fail(old, new Error("late error")), "lease_lost");
  await h.queue.finish(current, await processJob(h.queue, current));
  assert.equal((await h.queue.status(ORG)).counts.succeeded, 1);
});

test("dead-letter reports block later source pages while unrelated workspace jobs can run", async (t) => {
  const h = setup(t);
  await h.enqueue("failed-page", h.batch([h.report(1)]));
  await h.enqueue("later-page", h.batch([h.report(2)], 1, "page-1", "page-2"));
  const failed = await h.queue.claim();
  assert.equal(await h.queue.fail(failed, new OSError("SOURCE_EVENT_CONFLICT")), "dead_letter");
  await h.enqueue("unrelated-job", undefined, "fixture_other");
  const next = await h.queue.claim(); assert.equal(next.organization_id, "fixture_other");
  await h.queue.finish(next, await processJob(h.queue, next));
  assert.equal(await h.queue.claim(), null);
  assert.equal((await h.cursor()).applied_revision, 0);
  await assert.rejects(h.queue.retry("fixture_other", failed.id, 1), { code: "JOB_NOT_FOUND" });
  await h.queue.retry(ORG, failed.id, 1);
  await h.queue.retry(ORG, failed.id, 1); // Retry response loss is safe.
  assert.equal((await drainJobs(h.queue)).succeeded, 2);
  assert.equal((await h.cursor()).applied_revision, 2);
});

test("bounded retry exhaustion, including abandoned last leases, becomes visible", async (t) => {
  const h = setup(t); await h.enqueue("retry-exhaustion");
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    const job = await h.queue.claim(); assert.equal(job.attempts, i);
    h.tick(LEASE_MS + 1); // Worker died, even on its final attempt.
  }
  assert.equal(await h.queue.claim(), null);
  const job = (await h.queue.status(ORG)).jobs[0];
  assert.equal(job.status, "dead_letter"); assert.equal(job.error_code, "LEASE_EXHAUSTED");
  await assert.rejects(h.queue.retry(ORG, job.id, 1), { code: "JOB_CHANGED" });
  await h.queue.retry(ORG, job.id, job.total_attempts);
  assert.equal((await drainJobs(h.queue)).succeeded, 1);
});

test("user queue status omits source payloads, cursor tokens, leases and other tenants", async (t) => {
  const h = setup(t);
  await h.enqueue("private-page", h.batch([h.report(1)], 0, null, "opaque-sensitive-cursor"));
  await h.enqueue("other-job", undefined, "fixture_other");
  const status = await h.queue.status(ORG), json = JSON.stringify(status);
  assert.equal(status.jobs.length, 1);
  for (const privateKey of ["opaque-sensitive", "net_revenue_micros", "lease_token", "fixture_other", "payload_json", "request_hash"]) assert.ok(!json.includes(privateKey));
});

test("hourly enrollment is revision-fenced, deduplicated, bounded and can be disabled", async (t) => {
  const h = setup(t);
  assert.equal(await h.queue.scheduleDue(), 0);
  await h.queue.configure(ORG, true, 0);
  await assert.rejects(h.queue.configure(ORG, false, 0), { code: "SETTINGS_CHANGED" });
  const counts = await Promise.all([h.queue.scheduleDue(), h.queue.scheduleDue()]);
  assert.equal(counts.reduce((a, b) => a + b, 0), 1);
  await drainJobs(h.queue);
  h.tick(3_600_001); assert.equal(await h.queue.scheduleDue(), 1);
  h.tick(3_600_001); assert.equal(await h.queue.scheduleDue(), 0); // Already pending, no queue growth.
  await h.queue.configure(ORG, false, 1);
  h.tick(3_600_001); assert.equal(await h.queue.scheduleDue(), 0);
  assert.equal((await h.queue.status(ORG)).background.enabled, false);
});

test("source scope and structural errors are rejected before jobs or cursors exist", async (t) => {
  const h = setup(t), wrong = h.report(1); wrong.organization_id = "fixture_other";
  await assert.rejects(h.enqueue("wrong-source-org", h.batch([wrong])), { code: "SOURCE_SCOPE" });
  const future = h.report(1); future.observed_at = "2030-01-01T00:00:00.000Z";
  await assert.rejects(h.enqueue("future-source-report", h.batch([future])), { code: "REPORT_TIME" });
  assert.equal((await h.queue.status(ORG)).jobs.length, 0);
});

test("jobs API scopes reads, writes and manual drains to the signed-in workspace", async (t) => {
  const h = setup(t), deps = { repository: h.repo };
  const request = (user, method = "GET", body, extra = {}) => new Request("https://test.local/api/os/jobs", { method, headers: { "oai-authenticated-user-id": user, origin: "https://test.local", "content-type": "application/json", "idempotency-key": "http-queued-work", ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const a = await handleOS(request("alice", "POST", { kind: "evaluate", payload: {} }), deps);
  assert.equal(a.status, 202); const first = await a.json();
  const b = await (await handleOS(request("bob"), deps)).json(); assert.equal(b.jobs.length, 0);
  assert.equal((await handleOS(request("bob", "GET", null, { "x-hy-expected-workspace": first.organization_id }), deps)).status, 409);
  const drain = await (await handleOS(request("bob", "POST", { kind: "drain", payload: {} }), deps)).json(); assert.equal(drain.processed.claimed, 0);
  assert.equal((await handleOS(request("alice", "POST", h.batch([h.report(1)])), deps)).status, 403);
  assert.equal((await handleOS(request("alice", "POST", { kind: "evaluate", payload: {} }, { origin: "https://evil.test" }), deps)).status, 403);
});

test("shared worker is disabled by default and only drains existing work with aggregate readback", async (t) => {
  const h = setup(t);
  const req = (body = { limit: 10 }, origin) => new Request("https://test.local/api/os/worker", { method: "POST", headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
  assert.equal((await handleOS(req(), { repository: h.repo })).status, 403);
  const deps = { repository: h.repo, privateWorkerEnabled: true };
  assert.equal((await handleOS(req({ organization_id: ORG }), deps)).status, 400);
  assert.equal((await handleOS(req({}, "https://evil.test"), deps)).status, 403);
  await h.enqueue("worker-evaluation");
  const res = await handleOS(req(), deps); assert.equal(res.status, 200);
  const summary = await res.json(); assert.equal(summary.succeeded, 1);
  assert.ok(!JSON.stringify(summary).includes(ORG));
  assert.equal((await h.repo.load()).revision, 1);
});

test("queued mock campaign runs all product handoffs and retains its isolated learning results", async (t) => {
  const h = setup(t);
  await h.enqueue("queued-full-trial", { kind: "mock_campaign", payload: {} });
  assert.equal((await drainJobs(h.queue)).succeeded, 1);
  const s = (await h.repo.load()).state;
  assert.equal(s.last_mock_trial.passed, true);
  assert.equal(s.source_reports?.length ?? 0, 0);
  assert.equal(s.last_mock_trial.healthy.increment_micros, 2_000_000_000);
  assert.equal(s.last_mock_trial.corrected.increment_micros, 0);
});

test("a failed acknowledgement transaction rolls back both success status and applied cursor", async (t) => {
  const h = setup(t); await h.enqueue("ack-rollback-page", h.batch([h.report(1)]));
  const job = await h.queue.claim(), result = await processJob(h.queue, job), batch = h.db.batch;
  h.db.batch = (statements) => batch([...statements, h.db.prepare("INSERT INTO os_workspaces(organization_id) VALUES(?)").bind("invalid")]);
  await assert.rejects(h.queue.finish(job, result));
  assert.equal((await h.cursor()).applied_revision, 0);
  assert.equal((await h.queue.status(ORG)).counts.running, 1);
  h.db.batch = batch; h.tick(LEASE_MS + 1);
  assert.equal((await drainJobs(h.queue)).succeeded, 1);
  assert.equal((await h.repo.load()).revision, 1);
});

test("queue backpressure preserves cursor position and existing same-key retries", async (t) => {
  const h = setup(t);
  for (let i = 0; i < 200; i++) await h.enqueue(`capacity-${i}`);
  await assert.rejects(h.enqueue("capacity-overflow", h.batch([h.report(1)])), { code: "QUEUE_CAPACITY" });
  assert.equal((await h.cursor()).received_revision, 0);
  assert.equal((await h.enqueue("capacity-0")).replayed, true);
  assert.equal((await h.queue.status(ORG)).counts.queued, 200);
});

test("trusted source cursor read enables safe adapter continuation without exposing tokens to browsers", async (t) => {
  const h = setup(t), key = "test-trusted-source-key-at-least-32-characters", deps = { repository: h.repo, serviceKey: key };
  const p = h.batch([h.report(1)]).payload;
  await h.enqueue("cursor-read-page", { kind: "source_batch", payload: p });
  const url = `https://test.local/api/os/source-cursor?source=${p.source}&account=${p.managed_account_id}`;
  assert.equal((await handleOS(new Request(url, { headers: { "oai-authenticated-user-id": "owner" } }), deps)).status, 403);
  const res = await handleOS(new Request(url, { headers: { "x-hy-service-key": key, "x-hy-workspace": ORG } }), deps);
  assert.equal(res.status, 200); assert.equal((await res.json()).received_cursor, "page-1");
});

test("queued qualitative feedback changes recommendations without becoming outcome evidence", async (t) => {
  const h = setup(t);
  await h.repo.execute(h.input("initial-source", { kind: "source_report", payload: h.report(1) }));
  assert.equal((await h.repo.load()).state.latest.chosen.increment_micros, 2_000_000_000);
  await h.enqueue("qualitative-feedback", { kind: "feedback_batch", payload: { items: [{ source: "manual_import", external_id: "survey-job-1", category: "lead_quality", polarity: "negative", severity: "high", text: "The new inquiries are outside our service area." }] } });
  assert.equal((await drainJobs(h.queue)).succeeded, 1);
  const state = (await h.repo.load()).state;
  assert.equal(state.latest.chosen.increment_micros, 0);
  assert.equal(state.learning.observations.length, 1);
  assert.equal(state.feedback.length, 1);
});

import { requireValue } from "./contracts.mjs";
import { runMockCampaignTrial } from "./mock-campaign-trial.mjs";

/** Stateless runner: leases survive processes; OS receipts survive lost acknowledgements. */
export async function processJob(queue, job) {
  const p = JSON.parse(job.payload_json), repository = queue.repository;
  const base = { actor_id: job.actor_id, organization_id: job.organization_id };
  const checkLease = async () => requireValue(await queue.owns(job), "LEASE_LOST", "This attempt no longer owns the job.", 409);
  await checkLease();
  if (job.kind === "mock_campaign") {
    const result = await runMockCampaignTrial({ repository, ...base, key: `job:${job.id}` });
    return { ...result.receipt, reports_applied: 0, trial_passed: result.state.last_mock_trial?.passed ?? false };
  }
  const commands = job.kind === "source_batch"
    ? p.reports.map((payload) => ({ kind: "source_report", payload }))
    : job.kind === "optimization_batch"
      ? p.reports.map((payload) => ({ kind: "optimization_report", payload }))
    : [{ kind: job.kind, payload: p }];
  let last;
  for (let i = 0; i < commands.length; i++) {
    await checkLease();
    last = await repository.execute({ ...base, key: `job:${job.id}:${i}`, command: commands[i] });
  }
  return { ...last.receipt, reports_applied: ["source_batch", "optimization_batch"].includes(job.kind) ? commands.length : 0 };
}
export async function drainJobs(queue, { organization_id = null, limit = 10, budgetMs = 25_000, process = processJob } = {}) {
  requireValue(Number.isInteger(limit) && limit >= 1 && limit <= 10, "WORKER_LIMIT", "Drain between 1 and 10 jobs.");
  const started = performance.now();
  const summary = { claimed: 0, succeeded: 0, retrying: 0, dead_letter: 0, lease_lost: 0 };
  while (summary.claimed < limit && performance.now() - started < budgetMs) {
    const job = await queue.claim(organization_id);
    if (!job) break;
    summary.claimed++;
    try {
      const result = await process(queue, job);
      await queue.finish(job, result);
      summary.succeeded++;
    } catch (error) {
      const status = await queue.fail(job, error);
      summary[status === "queued" ? "retrying" : status]++;
    }
  }
  return summary;
}

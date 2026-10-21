import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { sqliteD1 } from '../tests/helpers/sqlite-d1.mjs';
import { OSRepository } from '../src/os/repository.mjs';
import { OSJobRepository } from '../src/os/job-repository.mjs';
import { drainJobs } from '../src/os/job-worker.mjs';
import { runGrowthLearning } from '../src/os/workflow.mjs';
import { digest } from '../src/os/contracts.mjs';
import { makeCustomerDataset, validateCustomerDataset, reportForCustomer, CUSTOMER_CLOCKS } from '../src/os/customer-fixtures.mjs';

// Deliberately has no network, production DB binding, credentials, or ad execution adapter.
const { values } = parseArgs({ options: { input: { type: 'string' }, output: { type: 'string', default: 'artifacts/customer-simulation' } } });
const dataset = validateCustomerDataset(values.input ? JSON.parse(await readFile(values.input, 'utf8')) : makeCustomerDataset());
const directory = resolve(values.output);
await mkdir(directory, { recursive: true });
const db = sqliteD1();
let at = CUSTOMER_CLOCKS.baseline;
const repository = new OSRepository(db, { evaluate: runGrowthLearning, clock: () => at });
const queue = new OSJobRepository(repository);
const actor_id = 'fixture:customer-dataset';
const initial = new Map(), personal = new Map(), records = [];
const drainLog = [];
const pack = (state) => ({
  type: state.latest.type, increment_usd: state.latest.chosen.increment_micros / 1e6,
  qualification: state.learning.model.qualification.mean,
  qualification_lower: state.learning.model.qualification.lower,
  qualification_upper: state.learning.model.qualification.upper,
  prior_source: state.learning.model.prior_source,
  prior_strength: state.learning.model.prior_strength,
  personal_weight: state.learning.model.personal_weight,
  cohort_participants: state.learning.model.aggregate.participants,
  failed_gates: state.latest.gates.filter(g => !g.pass).map(g => g.key),
  decision_id: state.latest.id, workflow: state.latest.orchestrator,
});
async function drain(expected) {
  let succeeded = 0;
  for (let attempts = 0; attempts < Math.ceil(expected / 10) + 2; attempts++) {
    const result = await drainJobs(queue, { limit: 10 });
    drainLog.push(result);
    assert.equal(result.retrying + result.dead_letter + result.lease_lost, 0, 'Job failed');
    succeeded += result.succeeded;
    if (!result.claimed) break;
  }
  assert.equal(succeeded, expected);
}
try {
  for (const stage of ['baseline', 'updated']) {
    at = CUSTOMER_CLOCKS[stage];
    for (const row of dataset.customers) {
      const command = { kind: 'source_batch', payload: {
        source: 'fixture_hellyeah_google', managed_account_id: row.managed_account_id,
        expected_revision: stage === 'baseline' ? 0 : 1,
        from_cursor: stage === 'baseline' ? null : 'baseline', next_cursor: stage,
        reports: [reportForCustomer(row, stage)],
      } };
      await queue.enqueue({ organization_id: row.organization_id, actor_id, key: `dataset:${stage}`, command });
      const replay = await queue.enqueue({ organization_id: row.organization_id, actor_id, key: `dataset:${stage}`, command });
      assert.equal(replay.replayed, true, 'Duplicate delivery must not duplicate jobs');
    }
    await drain(100);
    if (stage === 'baseline') for (const row of dataset.customers)
      initial.set(row.organization_id, pack((await repository.load(row.organization_id)).state));
  }
  for (const row of dataset.customers) await queue.enqueue({
    organization_id: row.organization_id, actor_id, key: 'dataset:feedback',
    command: { kind: 'feedback_batch', payload: { items: [row.feedback] } },
  });
  await drain(100);
  for (const row of dataset.customers) personal.set(row.organization_id, pack((await repository.load(row.organization_id)).state));
  for (const row of dataset.customers) if (row.aggregate_opt_in) await repository.execute({
    organization_id: row.organization_id, actor_id, key: 'dataset:opt-in',
    command: { kind: 'learning_consent', payload: { opt_in: true } },
  });
  for (const row of dataset.customers) await queue.enqueue({
    organization_id: row.organization_id, actor_id, key: 'dataset:cohort-refresh', command: { kind: 'evaluate', payload: {} },
  });
  await drain(100);
  const contributors = new Set(db.sqlite.prepare('SELECT organization_id FROM os_cohort_contributions').all().map(r => r.organization_id));
  const cohortCount = contributors.size;
  for (const org of contributors) assert.equal(dataset.customers.find(r => r.organization_id === org)?.aggregate_opt_in, true);
  if (!values.input) assert.equal(cohortCount, 80);
  for (const row of dataset.customers) {
    const saved = await repository.load(row.organization_id), state = saved.state, final = pack(state);
    const cursor = await queue.cursor(row.organization_id, 'fixture_hellyeah_google', row.managed_account_id);
    assert.equal(cursor.applied_revision, 2);
    assert.equal(state.source_reports.length, 2);
    assert.equal(state.learning.observations.length, 2);
    assert.equal(state.feedback.length, 1);
    assert.equal(state.proposals.length + state.review_handoffs.length, 0);
    assert.equal(final.workflow, 'Mastra');
    const otherContributors = cohortCount - Number(contributors.has(row.organization_id));
    assert.equal(final.cohort_participants, otherContributors >= 5 ? otherContributors : 0);
    if (!values.input) {
      const shouldGrow = ['growth_recovery', 'steady_growth'].includes(row.scenario);
      assert.equal(final.increment_usd > 0, shouldGrow, `${row.customer_id}: scenario mismatch`);
    }
    records.push({
      customer_id: row.customer_id, scenario: row.scenario, organization_id: row.organization_id,
      aggregate_opt_in: row.aggregate_opt_in,
      baseline: initial.get(row.organization_id), personal: personal.get(row.organization_id), final,
      revision: saved.revision, source_windows: state.source_reports.length,
      feedback_count: state.feedback.length, cursor, audit: await repository.audit(row.organization_id),
      learning: state.learning.model,
    });
  }
  const health = await queue.health();
  assert.deepEqual(health, { queued: 0, running: 0, succeeded: 400, dead_letter: 0 });
  const summary = {
    dataset_id: dataset.dataset_id, input_hash: digest(dataset), synthetic: true,
    initial_evaluated_at: CUSTOMER_CLOCKS.baseline, final_evaluated_at: CUSTOMER_CLOCKS.updated,
    customers: records.length, source_reports: 200, feedback_records: 100,
    aggregate_contributors: cohortCount, queue: health, duplicate_deliveries_deduplicated: 200,
    eligible_for_growth: records.filter(r => r.final.increment_usd > 0).length,
    held: records.filter(r => r.final.increment_usd === 0).length,
    increases: records.filter(r => r.final.increment_usd > r.baseline.increment_usd).length,
    decreases: records.filter(r => r.final.increment_usd < r.baseline.increment_usd).length,
    unchanged: records.filter(r => r.final.increment_usd === r.baseline.increment_usd).length,
    cohort_estimates_changed: records.filter(r => r.personal.qualification !== r.final.qualification).length,
    total_increment_before_usd: records.reduce((n,r) => n + r.baseline.increment_usd, 0),
    total_increment_after_usd: records.reduce((n,r) => n + r.final.increment_usd, 0),
    real_spend_usd: 0, live_execution: false,
    interpretation: 'Functional synthetic replay only. Recommendation changes are not measured revenue lift. Proposal values are not executed spend. Cohort estimates use clipped, equal-weight opt-in contributions; personal financial safety gates remain authoritative.',
  };
  await writeFile(resolve(directory, 'customers.json'), JSON.stringify(dataset, null, 2) + '\n');
  await writeFile(resolve(directory, 'results.json'), JSON.stringify({ summary, drainLog, records }, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} finally { db.close(); }

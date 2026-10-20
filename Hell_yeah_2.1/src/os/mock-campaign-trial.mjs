import { MockGoogleCampaign } from "./adapters/mock-google.mjs";
import { digest, requireValue } from "./contracts.mjs";
/** Orchestrates the real repository/workflow against a fully isolated mock account. */
export async function runMockCampaignTrial({
  repository,
  actor_id,
  organization_id,
  key,
}) {
  requireValue(
    typeof key === "string" && /^[a-zA-Z0-9._:-]{8,128}$/.test(key),
    "IDEMPOTENCY_KEY",
    "Use a stable 8–128 character trial key.",
  );
  const trial_id = digest([organization_id, key]).slice(0, 24),
    trialOrg = `fixture_trial_${trial_id}`;
  const existing = await repository.operation(
    organization_id,
    key,
    { kind: "mock_campaign", payload: {} },
    actor_id,
  );
  if (existing) return existing;
  // Stable clock across retries makes the generated source reports byte-identical.
  const prior = await repository.ensureWorkspace(trialOrg),
    at = prior.state.trial_started_at ?? prior.state.snapshot.at;
  const campaign = new MockGoogleCampaign({ organization_id: trialOrg, at });
  const op = campaign.submit("mock-launch"),
    beforeRetry = structuredClone(campaign.source.fixture.wallet);
  campaign.submit("mock-launch");
  const reservedOnce =
    JSON.stringify(beforeRetry) ===
    JSON.stringify(campaign.source.fixture.wallet);
  campaign.serve("mock-launch");
  const execute = (suffix, kind, payload) =>
    repository.execute({
      actor_id,
      organization_id: trialOrg,
      key: `${trial_id}:${suffix}`,
      command: { kind, payload },
    });
  const good = campaign.report({ revision: 1, quality: "healthy" });
  const first = await execute("healthy", "source_report", good);
  const firstDecision = first.state.decisions.find(
    (d) => d.id === first.receipt.decision_id,
  );
  await execute("healthy-duplicate", "source_report", good);
  const corrected = campaign.report({ revision: 2, quality: "poor" });
  const second = await execute("corrected", "source_report", corrected);
  const secondDecision = second.state.decisions.find(
    (d) => d.id === second.receipt.decision_id,
  );
  const observations = second.state.learning.observations.filter(
    (x) => !x.superseded,
  );
  const result = {
    id: trial_id,
    at,
    mode: "fixture",
    network_calls: 0,
    source_operation_id: op.id,
    products: {
      creative: {
        hypothesis: campaign.hypothesis,
        capture_mode: "owned text fixture; no real screen capture",
        status: "Observed evidence",
      },
      simulator: {
        forecast: campaign.forecast,
        status: "Uncalibrated planning",
      },
      experimentation: {
        ...campaign.experiment,
        status: "Inconclusive fixture analysis",
      },
      os: { status: "Outcome-driven revision", trace_id: trial_id },
    },
    events: campaign.events,
    reservation_once: reservedOnce,
    healthy: {
      decision_id: firstDecision.id,
      type: firstDecision.type,
      increment_micros: firstDecision.chosen.increment_micros,
      contribution_micros: firstDecision.economics.contribution_micros,
      qualification: firstDecision.learning.qualification.mean,
      orchestrator: firstDecision.orchestrator ?? "Test evaluator",
    },
    corrected: {
      decision_id: secondDecision.id,
      type: secondDecision.type,
      increment_micros: secondDecision.chosen.increment_micros,
      contribution_micros: secondDecision.economics.contribution_micros,
      qualification: secondDecision.learning.qualification.mean,
      orchestrator: secondDecision.orchestrator ?? "Test evaluator",
    },
    active_outcome_windows: observations.length,
    source_revision: 2,
    wallet: structuredClone(campaign.source.fixture.wallet),
  };
  result.passed =
    reservedOnce &&
    result.healthy.increment_micros > 0 &&
    result.corrected.increment_micros === 0 &&
    observations.length === 1 &&
    result.corrected.qualification < result.healthy.qualification;
  return repository.execute({
    actor_id,
    organization_id,
    key,
    command: { kind: "record_mock_trial", payload: { result } },
    requestIdentity: { kind: "mock_campaign", payload: {} },
  });
}

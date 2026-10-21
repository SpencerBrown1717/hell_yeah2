import { initialOS, applyCommand } from "./kernel.mjs";
import { runGrowthLearning } from "./workflow.mjs";
const state = initialOS();
const context = {
  at: new Date().toISOString(),
  organization_id: state.organization_id,
  actor_id: "fixture_owner",
  operation_id: "demo_growth_cycle",
};
applyCommand(
  state,
  { kind: "sample", payload: { name: "scale_ready" } },
  context,
);
const before = await runGrowthLearning(state, context);
applyCommand(
  state,
  {
    kind: "feedback",
    payload: {
      source: "customer",
      external_id: "demo-quality-1",
      category: "lead_quality",
      polarity: "negative",
      severity: "high",
      text: "Recent customers are not a good fit. Please review the targeting.",
    },
  },
  context,
);
const after = await runGrowthLearning(state, {
  ...context,
  operation_id: "demo_feedback_cycle",
});
console.log(
  JSON.stringify(
    {
      orchestrator: "Mastra",
      source: "synthetic",
      before: { type: before.type, increment: before.chosen.increment_micros },
      after: {
        type: after.type,
        increment: after.chosen.increment_micros,
        blockers: after.feedback_summary.blocker_ids.length,
      },
    },
    null,
    2,
  ),
);

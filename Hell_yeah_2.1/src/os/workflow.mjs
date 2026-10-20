import { createWorkflow, createStep } from "@mastra/core/workflows";
import { Mastra } from "@mastra/core/mastra";
import { z } from "zod";
import {
  policySchema,
  evaluateGrowth,
  synthesizeFeedback,
  validOrg,
  requireValue,
} from "./kernel.mjs";
import { learnCustomer } from "./learning.mjs";
const input = z.object({
  state: z
    .object({
      organization_id: z.string(),
      mode: z.literal("fixture"),
      policy: policySchema,
      feedback: z.array(z.record(z.string(), z.unknown())),
    })
    .passthrough(),
  at: z.string(),
  runId: z.string(),
  aggregate: z.record(z.string(), z.unknown()).optional(),
});
const context = createStep({
  id: "validate-context",
  inputSchema: input,
  outputSchema: input,
  execute: async ({ inputData }) => {
    requireValue(
      validOrg(inputData.state.organization_id),
      "ORGANIZATION_DENIED",
    );
    return inputData;
  },
});
const synthesized = input.extend({
  feedbackSummary: z.record(z.string(), z.unknown()),
});
const feedback = createStep({
  id: "synthesize-feedback",
  inputSchema: input,
  outputSchema: synthesized,
  execute: async ({ inputData }) => ({
    ...inputData,
    feedbackSummary: synthesizeFeedback(inputData.state.feedback),
  }),
});
const learning = createStep({
  id: "update-personal-and-cohort-evidence",
  inputSchema: synthesized,
  outputSchema: synthesized,
  execute: async ({ inputData }) => {
    inputData.state.learning.model = learnCustomer(
      inputData.state,
      inputData.aggregate,
      inputData.at,
    );
    return inputData;
  },
});
const result = z.record(z.string(), z.unknown());
const evaluate = createStep({
  id: "evaluate-customer-economics",
  inputSchema: synthesized,
  outputSchema: result,
  execute: async ({ inputData }) => ({
    ...evaluateGrowth(inputData.state, {
      at: inputData.at,
      runId: inputData.runId,
    }),
    learning: inputData.state.learning.model,
  }),
});
export const growthLearningWorkflow = createWorkflow({
  id: "growth-feedback-roi",
  inputSchema: input,
  outputSchema: result,
})
  .then(context)
  .then(feedback)
  .then(learning)
  .then(evaluate)
  .commit();
const mastra = new Mastra({ workflows: { growthLearningWorkflow } });
export async function runGrowthLearning(state, context) {
  const run = await mastra.getWorkflow("growthLearningWorkflow").createRun();
  const output = await run.start({
    inputData: {
      state,
      at: context.at,
      runId: context.operation_id,
      aggregate: context.aggregate,
    },
  });
  if (output.status !== "success")
    throw new Error("Growth workflow did not complete.");
  return {
    ...output.result,
    orchestrator: "Mastra",
    workflow_id: "growth-feedback-roi",
    workflow_run_id: run.runId ?? context.operation_id,
  };
}

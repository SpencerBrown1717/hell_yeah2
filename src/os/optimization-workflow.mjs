import { createWorkflow, createStep } from "@mastra/core/workflows";
import { Mastra } from "@mastra/core/mastra";
import { z } from "zod";
import { learnStrategies } from "./optimization-learning.mjs";
const input = z.object({
  context: z.record(z.string(), z.unknown()),
  aggregate: z.record(z.string(), z.unknown()),
  feedback: z.array(z.record(z.string(), z.unknown())),
  at: z.iso.datetime(),
});
const update = createStep({
  id: "compare-personal-and-consented-network-evidence",
  inputSchema: input, outputSchema: z.record(z.string(), z.unknown()),
  execute: async ({ inputData: x }) => learnStrategies(x.context, x.aggregate, x.feedback, x.at),
});
const optimizationWorkflow = createWorkflow({
  id: "continuous-campaign-learning",
  inputSchema: input, outputSchema: z.record(z.string(), z.unknown()),
}).then(update).commit();
const mastra = new Mastra({ workflows: { optimizationWorkflow } });
export async function runOptimizationLearning(inputData) {
  const run = await mastra.getWorkflow("optimizationWorkflow").createRun();
  const output = await run.start({ inputData });
  if (output.status !== "success") throw new Error("Continuous learning did not complete.");
  return { ...output.result, orchestrator: "Mastra" };
}

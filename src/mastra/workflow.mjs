import { Mastra } from '@mastra/core/mastra';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { runGrowthCycle, ensureMode } from '../domain.mjs';
import { fixtureSchema } from '../../contracts/schemas.mjs';

// This verifies real Mastra typed workflow orchestration over deterministic tools.
// Production durable storage, model agents and source transports are not yet implemented.
const inputSchema = z.object({ fixture: fixtureSchema });
const outputSchema = z.object({ mode: z.literal('fixture'), plan_hash: z.string(), result: z.record(z.string(), z.unknown()) });
const executeReference = createStep({
  id: 'execute-fixture-growth-cycle', inputSchema, outputSchema,
  execute: async ({ inputData }) => {
    ensureMode();
    const result = runGrowthCycle(inputData.fixture);
    return { mode: 'fixture', plan_hash: result.plan_hash, result };
  },
});
export const growthWorkflow = createWorkflow({ id: 'fixture-growth-cycle', inputSchema, outputSchema }).then(executeReference).commit();
export const mastra = new Mastra({ workflows: { growthWorkflow } });

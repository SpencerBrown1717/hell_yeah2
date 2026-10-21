import { readFile } from 'node:fs/promises';
import { mastra } from './workflow.mjs';
const fixture = JSON.parse(await readFile(new URL('../../fixtures/scenario.json', import.meta.url), 'utf8'));
const run = await mastra.getWorkflow('growthWorkflow').createRun();
const output = await run.start({ inputData: { fixture } });
if (output.status !== 'success') throw new Error(`Mastra workflow ended with ${output.status}`);
console.log(JSON.stringify({ framework: 'Mastra', status: output.status, ...output.result }, null, 2));

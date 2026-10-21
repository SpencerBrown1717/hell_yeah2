import { readFile } from 'node:fs/promises';
import { runGrowthCycle } from './domain.mjs';
const fixture = JSON.parse(await readFile(new URL('../fixtures/scenario.json', import.meta.url), 'utf8'));
console.log(JSON.stringify(runGrowthCycle(fixture), null, 2));

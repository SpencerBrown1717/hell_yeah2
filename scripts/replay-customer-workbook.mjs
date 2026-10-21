import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [file, output = 'artifacts/workbook-replay'] = process.argv.slice(2);
if (!file || process.argv.length > 4) {
  console.error('Usage: npm run replay:workbook -- INPUT.xlsx [OUTPUT_DIRECTORY]');
  process.exit(1);
}
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = resolve(output);
mkdirSync(directory, { recursive: true });
const input = resolve(directory, 'workbook-input.json');
for (const [binary, args] of [
  ['python3', [resolve(root, 'scripts/import-customer-workbook.py'), resolve(file), input]],
  [process.execPath, [resolve(root, 'scripts/simulate-customers.mjs'), '--input', input, '--output', directory]],
]) {
  const result = spawnSync(binary, args, { cwd: root, stdio: 'inherit', timeout: 120_000 });
  if (result.error || result.status !== 0) {
    console.error(result.error?.message ?? 'Customer replay failed; no production state was changed.');
    process.exit(result.status || 1);
  }
}

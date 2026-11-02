// Stop: before handing control back, run the fast test suites of the areas touched
// during this turn. Failing tests block the stop (exit 2) unless we are in the RED phase.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { feedback, loadConfig, projectDir, readInput, readState, tddPhase, writeState } from './lib.mjs';

await readInput();
const config = loadConfig();
const touched = readState('touched.json', []);
if (touched.length === 0) process.exit(0);

if (tddPhase() === 'red') {
  // Failing tests are the expected outcome of the RED phase.
  process.stdout.write(JSON.stringify({ systemMessage: 'Phase TDD RED : tests non exécutés au Stop (échec attendu).' }));
  process.exit(0);
}

const failures = [];
for (const suite of config.stopTests) {
  if (!touched.includes(suite.area)) continue;
  if (!fs.existsSync(path.join(projectDir, suite.requires))) continue;
  const run = spawnSync(suite.command, { cwd: projectDir, shell: true, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (run.status !== 0) {
    const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim().split(/\r?\n/).slice(-60).join('\n');
    failures.push(`### ${suite.area} — \`${suite.command}\`\n${output}`);
  }
}

if (failures.length === 0) {
  writeState('touched.json', []);
  writeState('stop-retries.json', 0);
  process.exit(0);
}

const retries = readState('stop-retries.json', 0) + 1;
if (retries > config.maxStopRetries) {
  writeState('stop-retries.json', 0);
  process.stdout.write(
    JSON.stringify({ systemMessage: `Tests toujours en échec après ${config.maxStopRetries} tentatives : vérification manuelle nécessaire.` }),
  );
  process.exit(0);
}
writeState('stop-retries.json', retries);

feedback(`
Des tests échouent (tentative ${retries}/${config.maxStopRetries}). Corrige-les avant de terminer,
ou, si tu es volontairement en phase RED, écris "red" dans .claude/.state/tdd-phase.

${failures.join('\n\n')}
`);

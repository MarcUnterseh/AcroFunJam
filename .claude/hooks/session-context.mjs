// SessionStart: inject a short reminder of the current TDD phase and the workflow.
import fs from 'node:fs';
import path from 'node:path';
import { projectDir, readInput, stateFlag, tddPhase } from './lib.mjs';

await readInput();
const phase = tddPhase();
const scaffolded = fs.existsSync(path.join(projectDir, 'api', 'AcroFunJam.slnx'));
const wip = [];
const featuresDir = path.join(projectDir, 'specs', 'features');
const scan = (dir) => {
  for (const e of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) scan(full);
    else if (e.name.endsWith('.feature') && /@wip\b/.test(fs.readFileSync(full, 'utf8'))) wip.push(path.relative(projectDir, full));
  }
};
scan(featuresDir);

const lines = [
  '## Contexte AcroFunJam (hook SessionStart)',
  `- Phase TDD courante : ${phase ?? 'aucune'}${phase ? ' (.claude/.state/tdd-phase)' : ''}`,
  `- Garde TDD : ${stateFlag('tdd-guard-off') ? 'DÉSACTIVÉ (.claude/.state/tdd-guard-off), pense à le réactiver' : 'actif'}`,
  `- Squelette du projet : ${scaffolded ? 'présent' : 'absent, lancer /bootstrap'}`,
  wip.length ? `- Scénarios @wip en cours : ${wip.join(', ')}` : '- Aucun scénario @wip en cours',
  '- Flux : /feature (BDD → double boucle TDD) ; /tdd pour un cycle Red-Green-Refactor.',
];
process.stdout.write(lines.join('\n') + '\n');

// PreToolUse(Write): refuse to create a new production file in Domain/Application
// when no test references it yet. "No production code without a failing test."
import fs from 'node:fs';
import path from 'node:path';
import { feedback, loadConfig, projectDir, readInput, relativePath, stateFlag, walk } from './lib.mjs';

const input = await readInput();
const filePath = input.tool_input?.file_path;
const rel = relativePath(filePath);

if (!rel || process.env.TDD_GUARD === 'off' || stateFlag('tdd-guard-off')) process.exit(0);
// Editing/overwriting an existing file is refactoring territory: only guard creations.
if (fs.existsSync(path.resolve(projectDir, rel))) process.exit(0);

const { tddGuard } = loadConfig();
if (tddGuard.exemptFilePatterns.some((p) => new RegExp(p).test(rel))) process.exit(0);

const rule = tddGuard.productionGlobs.find((g) => new RegExp(g.pattern).test(rel));
if (!rule) process.exit(0);

const ext = path.extname(rel);
const subject = path.basename(rel, ext); // class / module name
const word = new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

for (const file of walk(path.join(projectDir, rule.testsRoot))) {
  const normalized = file.split(path.sep).join('/');
  if (!rule.testExt.some((e) => normalized.endsWith(e))) continue;
  if (rule.testExt.includes('.cs') && !/\/[^/]*Tests?\//.test(normalized) && !/Specs\//.test(normalized)) continue;
  if (word.test(fs.readFileSync(file, 'utf8'))) process.exit(0);
}

feedback(`
TDD guard : création de "${rel}" refusée.
Aucun test sous "${rule.testsRoot}" ne référence "${subject}".
Écris d'abord un test qui échoue (phase RED, agent tdd-red ou skill /tdd), puis crée ce fichier.
Si c'est un port, un DTO ou du code généré, renomme selon les exemptions de .claude/hooks/config.json
ou crée temporairement .claude/.state/tdd-guard-off (à supprimer ensuite).
`);

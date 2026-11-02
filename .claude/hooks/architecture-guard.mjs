// PostToolUse(Write|Edit|MultiEdit): reject imports that break the dependency rule,
// and record which area (api/front) was touched for the Stop hook.
import fs from 'node:fs';
import path from 'node:path';
import { feedback, loadConfig, projectDir, readInput, readState, relativePath, writeState } from './lib.mjs';

const input = await readInput();
const rel = relativePath(input.tool_input?.file_path);
if (!rel) process.exit(0);

const config = loadConfig();

const touchedArea = config.stopTests.find((t) => rel.startsWith(t.pathPrefix))?.area;
if (touchedArea) {
  const touched = new Set(readState('touched.json', []));
  touched.add(touchedArea);
  writeState('touched.json', [...touched]);
}

const rules = config.architectureGuard.rules.filter((r) => new RegExp(r.filePattern).test(rel));
if (rules.length === 0) process.exit(0);

let content;
try {
  content = fs.readFileSync(path.resolve(projectDir, rel), 'utf8');
} catch {
  process.exit(0);
}

const lines = content.split(/\r?\n/);
const violations = [];
for (const rule of rules) {
  for (const pattern of rule.forbidden) {
    const re = new RegExp(pattern);
    lines.forEach((line, i) => {
      if (re.test(line.trim())) violations.push(`  - [${rule.name}] ligne ${i + 1} : ${line.trim()}`);
    });
  }
}

if (violations.length > 0) {
  feedback(`
Violation de la règle de dépendance (clean architecture) dans "${rel}" :
${violations.join('\n')}
Le domaine et l'application ne dépendent que de couches plus internes.
Définis un port (interface) dans Application et implémente-le dans Infrastructure / api-client.
Voir le skill clean-architecture.
`);
}

// PostToolUse(Write|Edit|MultiEdit): format TypeScript/JSON files with the repo's Prettier.
// C# formatting relies on .editorconfig + `dotnet format` (too slow per file for a hook).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { projectDir, readInput, relativePath } from './lib.mjs';

const input = await readInput();
const rel = relativePath(input.tool_input?.file_path);
if (!rel || !rel.startsWith('front/') || !/\.(tsx?|jsx?|json|css|md)$/.test(rel)) process.exit(0);

const prettierBin = path.join(projectDir, 'front', 'node_modules', '.bin', process.platform === 'win32' ? 'prettier.cmd' : 'prettier');
if (!fs.existsSync(prettierBin)) process.exit(0); // front not installed yet

spawnSync(prettierBin, ['--write', '--log-level', 'warn', path.resolve(projectDir, rel)], {
  cwd: path.join(projectDir, 'front'),
  stdio: 'ignore',
  shell: process.platform === 'win32',
});
process.exit(0);

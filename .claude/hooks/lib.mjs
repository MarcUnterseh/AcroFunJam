// Shared helpers for the Claude Code hooks of this repository.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || path.join(here, '..', '..'));
export const stateDir = path.join(projectDir, '.claude', '.state');

export function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(here, 'config.json'), 'utf8'));
}

export async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

/** Project-relative path with forward slashes, or null when outside the project. */
export function relativePath(filePath) {
  if (!filePath) return null;
  const rel = path.relative(projectDir, path.resolve(projectDir, filePath)).split(path.sep).join('/');
  return rel.startsWith('..') ? null : rel;
}

export function readState(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(stateDir, name), 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeState(name, value) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, name), JSON.stringify(value, null, 2));
}

export function stateFlag(name) {
  return fs.existsSync(path.join(stateDir, name));
}

export function tddPhase() {
  try {
    return fs.readFileSync(path.join(stateDir, 'tdd-phase'), 'utf8').trim() || null;
  } catch {
    return null;
  }
}

/** Recursively lists files under dir, skipping heavy/generated folders. */
export function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (['node_modules', 'bin', 'obj', '.git', 'dist', 'build', '.expo', 'coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Exit with code 2: stderr is fed back to Claude (blocks PreToolUse / Stop). */
export function feedback(message) {
  process.stderr.write(message.trim() + '\n');
  process.exit(2);
}

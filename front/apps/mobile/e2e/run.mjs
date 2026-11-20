#!/usr/bin/env node
// Maestro runner of the app (story 9b, ADR 0038), on a real API and a database of its own (acrofunjam_e2e: the development
// database is never touched).
//
//   node e2e/run.mjs [flow names…]     (all the flows without argument)
//
// Before: Docker (PostgreSQL), the e2e API on :5253 (launch configuration « api-e2e »), the Android emulator, and the
// app bundled with EXPO_PUBLIC_API_URL=http://10.0.2.2:5253. For each flow `<name>.yaml`, the catalog of
// `<name>.catalog.json` (if any) replaces the published poses and transitions, then `maestro test` runs it.
// « AcroFunJam injoignable »: the flows put the device in airplane mode (Maestro `setAirplaneMode`).

import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repository = join(here, '..', '..', '..', '..');
const container = process.env.E2E_DB_CONTAINER ?? 'acrofunjam2-postgres-1';
const database = 'acrofunjam_e2e';
const connectionString = `Host=localhost;Port=5432;Database=${database};Username=acrofunjam;Password=acrofunjam`;

const psql = (sql, db = database) =>
  execFileSync('docker', ['exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-q', '-U', 'acrofunjam', '-d', db], {
    input: sql,
    encoding: 'utf8',
  });

const quote = (value) => (value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`);

/** The database of the runs: created once, migrated each time (idempotent). */
const prepareDatabase = () => {
  const exists = psql(`SELECT 1 FROM pg_database WHERE datname = '${database}';`, 'postgres').includes('1');
  if (!exists) psql(`CREATE DATABASE ${database};`, 'postgres');
  execFileSync(
    'dotnet',
    ['ef', 'database', 'update', '--project', 'api/src/AcroFunJam.Infrastructure', '--startup-project',
      'api/src/AcroFunJam.Infrastructure', '--connection', connectionString],
    { cwd: repository, stdio: 'inherit' },
  );
};

const levels = { découverte: 'discovery', débutant: 'beginner', intermédiaire: 'intermediate', avancé: 'advanced' };
const level = (label = 'débutant') => levels[label] ?? label;

/**
 * The catalog of a flow: { poses: [{ name, base?, flyer?, start?, end?, tags? }], transitions: [{ from, to, name?, base?,
 * flyer?, description?, tags? }] }; difficulties « débutant » and both flow boundaries unless stated. The list of tags
 * (seeded by the API at start) is kept: tags are named.
 */
const seedCatalog = (catalog) => {
  const ids = new Map(catalog.poses.map((pose) => [pose.name, randomUUID()]));
  const tags = (names = []) =>
    names.length === 0
      ? "'{}'::uuid[]"
      : `ARRAY(SELECT id FROM catalog.tags WHERE removed_at IS NULL AND name IN (${names.map(quote).join(', ')}))`;
  const sql = [
    'BEGIN;',
    'DELETE FROM catalog.transitions;',
    'DELETE FROM catalog.poses;',
    ...catalog.poses.map(
      (pose) =>
        `INSERT INTO catalog.poses (id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, published_at, version, tag_ids)
         VALUES (${quote(ids.get(pose.name))}, ${quote(pose.name)}, ${quote(pose.name.toLowerCase())}, ${quote(level(pose.base))},
                 ${quote(level(pose.flyer))}, ${pose.start ?? true}, ${pose.end ?? true}, now(), 1, ${tags(pose.tags)});`,
    ),
    ...(catalog.transitions ?? []).map(
      (transition) =>
        `INSERT INTO catalog.transitions (id, from_pose_id, to_pose_id, name, name_key, base_difficulty, flyer_difficulty, description, tag_ids, published_at)
         VALUES (${quote(randomUUID())}, ${quote(ids.get(transition.from))}, ${quote(ids.get(transition.to))}, ${quote(transition.name)},
                 ${quote(transition.name?.toLowerCase())}, ${quote(level(transition.base))}, ${quote(level(transition.flyer))},
                 ${quote(transition.description)}, ${tags(transition.tags)}, now());`,
    ),
    'COMMIT;',
  ].join('\n');
  psql(sql);
};

const maestro = () => {
  const local = join(homedir(), '.maestro', 'bin', process.platform === 'win32' ? 'maestro.bat' : 'maestro');
  return existsSync(local) ? local : 'maestro';
};

const main = async () => {
  // `--dir release`: the flows that need a release build (they reopen the app offline, see release/README.md).
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf('--dir');
  const folder = dirIndex >= 0 ? join(here, args[dirIndex + 1]) : here;
  const wanted = dirIndex >= 0 ? args.filter((_, index) => index !== dirIndex && index !== dirIndex + 1) : args;
  const flows = readdirSync(folder)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => basename(file, '.yaml'))
    .filter((name) => wanted.length === 0 || wanted.includes(name));
  prepareDatabase();
  // « Délai pour agir » of Android (accessibility): the app keeps « Revenir au flow précédent » that long (Q223). Maestro
  // reads the screen slowly, 10 s would run out between two steps: 2 minutes during the runs, the setting restored after.
  const adb = (...args) => spawnSync('adb', ['shell', ...args], { encoding: 'utf8' });
  const timeoutSettings = ['accessibility_interactive_ui_timeout_ms', 'accessibility_non_interactive_ui_timeout_ms'];
  const previousTimeouts = timeoutSettings.map((name) => adb('settings', 'get', 'secure', name).stdout.trim());
  for (const name of timeoutSettings) adb('settings', 'put', 'secure', name, '120000');
  const failed = [];
  for (const flow of flows) {
    const catalogFile = join(folder, `${flow}.catalog.json`);
    seedCatalog(existsSync(catalogFile) ? JSON.parse(readFileSync(catalogFile, 'utf8')) : { poses: [], transitions: [] });
    // A flow that failed in airplane mode leaves it on: every flow starts online.
    spawnSync('adb', ['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'], { stdio: 'ignore' });
    const run = spawnSync(maestro(), ['test', join(folder, `${flow}.yaml`)], { stdio: 'inherit', shell: process.platform === 'win32' });
    if (run.status !== 0) failed.push(flow);
  }
  timeoutSettings.forEach((name, index) => {
    const previous = previousTimeouts[index];
    if (previous === 'null' || previous === '') adb('settings', 'delete', 'secure', name);
    else adb('settings', 'put', 'secure', name, previous);
  });
  console.log(failed.length === 0 ? `${flows.length} flows passed.` : `Failed: ${failed.join(', ')}`);
  process.exit(failed.length === 0 ? 0 : 1);
};

await main();

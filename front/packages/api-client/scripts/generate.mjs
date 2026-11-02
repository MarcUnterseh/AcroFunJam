// Regenerates the TypeScript types of the API contract.
// Usage: npm run generate [-- <url-or-file>]
// Default: the OpenAPI document served by the API in development (dotnet run --project api/src/AcroFunJam.Api).
import { spawnSync } from 'node:child_process';

const source = process.argv[2] ?? process.env.OPENAPI_SOURCE ?? 'http://localhost:5252/openapi/v1.json';
const output = 'src/generated/schema.ts';

console.log(`openapi-typescript ${source} -> ${output}`);
const run = spawnSync('npx', ['openapi-typescript', source, '-o', output], { stdio: 'inherit', shell: true });
process.exit(run.status ?? 1);

// Downloads the backend's OpenAPI spec into docs/api/openapi.json (then run `npm run api:generate`).
// Uses EXPO_PUBLIC_API_URL from the environment or from .env.
import { readFileSync, writeFileSync } from 'node:fs';

function apiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL?.trim()) return process.env.EXPO_PUBLIC_API_URL.trim();
  try {
    const line = readFileSync('.env', 'utf8').split('\n').find((l) => l.startsWith('EXPO_PUBLIC_API_URL='));
    return line?.slice('EXPO_PUBLIC_API_URL='.length).trim() || undefined;
  } catch {
    return undefined;
  }
}

const base = apiUrl();
if (!base) {
  console.error('Set EXPO_PUBLIC_API_URL (in .env or the environment) first.');
  process.exit(1);
}
const url = `${base.replace(/\/+$/, '')}/openapi/v1.json`;
const response = await fetch(url);
if (!response.ok) {
  console.error(`GET ${url} failed: ${response.status}`);
  process.exit(1);
}
writeFileSync('docs/api/openapi.json', `${JSON.stringify(await response.json(), null, 2)}\n`);
console.log(`Saved ${url} to docs/api/openapi.json`);

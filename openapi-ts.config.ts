import { defineConfig } from '@hey-api/openapi-ts';

// Regenerate with `npm run api:generate`.
// The spec is owned by the backend (BE-001) and is OUTSTANDING: docs/api/openapi.yaml does not
// exist yet. In the AI workspace layout the docs folder sits one level above this repo.
export default defineConfig({
  input: '../docs/api/openapi.yaml',
  output: 'src/api/generated',
  plugins: ['@hey-api/typescript', '@hey-api/client-fetch', '@hey-api/sdk', '@tanstack/react-query'],
});

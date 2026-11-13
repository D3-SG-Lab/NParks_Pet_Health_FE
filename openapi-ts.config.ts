import { defineConfig } from '@hey-api/openapi-ts';

// Regenerate with `npm run api:generate`. The spec is owned by the backend and served at
// <EXPO_PUBLIC_API_URL>/openapi/v1.json; refresh the copy in docs/api/ with `npm run api:spec` first.
export default defineConfig({
  input: 'docs/api/openapi.json',
  output: 'src/api/generated',
  plugins: ['@hey-api/typescript', '@hey-api/client-fetch', '@hey-api/sdk'],
});

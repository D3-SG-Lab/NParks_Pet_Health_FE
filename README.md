# NParks_Pet_Health_FE

AQC Animal Health app: Expo SDK 57 + React Native + TypeScript, for iOS, Android and web.

## Setup

```bash
npm install
cp .env.example .env    # then fill in values (see below)
npm run web             # http://localhost:8081 — or npm run ios / npm run android
```

### Environment (`.env`, never committed)

Only `EXPO_PUBLIC_*` variables reach the bundle; they are read in `src/config/env.ts`.

- `EXPO_PUBLIC_AUTH_BYPASS=officer|contractor`: development only. Every launch starts signed in as that role, so you need no identity provider. To switch roles, open `/sign-in` and pick the other one. On web, the pick survives reloads in that tab.
- `EXPO_PUBLIC_AUTH_MODE=mock`: development only. The sign-in buttons issue mock tokens.
- `EXPO_PUBLIC_API_URL`: the backend, e.g. `https://linthitd3-001-site1.ktempurl.com` (use https). Empty = everything runs on the in-memory demo data in `src/mock/`. Restart the dev server after changing it.
- Real sign-in needs the `EXPO_PUBLIC_{OFFICER,CONTRACTOR}_OIDC_*` variables.

### Backend API

The endpoints come from `docs/NParksPetHealth_API.postman_collection.json`. With `EXPO_PUBLIC_API_URL` set, the screens use them for **backend animals** (numeric ids); everything without an endpoint stays on demo data:

- **Sign-in (mock and bypass modes):** `POST /auth/dev-token`; silent refresh with `POST /auth/refresh` and sign-out with `POST /auth/logout` when the backend issues a refresh token (otherwise a new dev token).
- **New Arrival and Arrival Exam:** kennels, countries, the microchip check, the exam draft (`/arrival-draft`), `POST /animals`, then `POST /animals/{id}/exam`.
- **Animals** (every list, the picker, Animal Profile): `GET /animals?status=staying`, `GET /animals/{id}`, `GET /animals/{id}/exam`.
- **Daily Inspection:** `POST` and `GET /animals/{id}/inspections` (the board and today's AM/PM status), `GET /animals/inspections/{id}` (record detail).
- **New Health Observation:** `POST /observations` (unlinked text, or a backend animal), `GET /observations/{id}`, `GET /animals/{id}/observations` (timeline).
- **Medication:** `GET /medication/animals`, `GET /animals/{id}/medication`, `POST /medication/administrations`. These aren't in the server's OpenAPI spec yet, so they're typed by hand in `src/api/manual.ts`.

Still demo data, as the backend has no endpoints for them: the AI result and routing (Confirm AI result, AI triage), health cases, the Operations alerts, and the AI summary. Media upload (`POST /media/presign`) and push tokens (`/me/push-token`) need a real camera/picker and push library, which the app doesn't have yet.

`EXPO_PUBLIC_DEMO_DATA=false` hides the demo animals and records, so only backend data shows. Records made with "Work offline (demo)" on stay on the device.

The typed client in `src/api/generated/` is generated from the backend's OpenAPI spec:

```bash
npm run api:spec       # download <EXPO_PUBLIC_API_URL>/openapi/v1.json to docs/api/openapi.json
npm run api:generate   # regenerate src/api/generated/ from it
```

On web, the dev server forwards `/api/` to the backend (`metro.config.js`) because the backend sends no CORS headers. iOS and Android call it directly.

## Commands

```bash
npm run build   # type-check (tsc --noEmit)
npm run lint    # expo lint
npm test        # jest
```

## Branches

`development` is the base branch. Feature work goes on `ai/<feature>` branches and is merged by pull request. After a PR merges, run `git checkout development && git pull` to get it locally.

## Docs

`docs/`: `Backlogs.xlsx` (requirements), `Wireframes.pdf`, `Product_Design.pdf` (design system), `Mobile_App_Design.pdf` (screens), `NParksPetHealth_API.postman_collection.json` and `api/openapi.json` (backend API), and `api-mock/` (the response shapes the screens expect).

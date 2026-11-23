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
- **New Arrival and Arrival Exam:** kennels, countries, the microchip check, the exam draft (`/arrival-draft`), `POST /animals` when step 1 is completed (the stay shows with its exam due), then `POST /animals/{id}/exam` in step 2. There's no endpoint to edit a stay, so its details can't change once registered. Species come from `GET /master-data/species?isActive=true` (the name is sent); the vet picker lists `GET /master-data/vet-specialisations?isActive=true`; exam photos (camera or library via `expo-image-picker`) are uploaded on completion through `POST /media/presign` and a `PUT` to the returned URL, and sent as `photoKeys`.
- **Animals** (every list, the picker, Animal Profile): `GET /animals?status=active-monitoring`, `GET /animals/{id}`, `GET /animals/{id}/exam`. The picker's recent animals add `GET /me/recent-animals`.
- **Animal Profile:** the health record comes from `GET /animals/{id}/timeline` (which also counts as "recently viewed"), shown with the app's detail for records it has loaded; the AI 30-day summary from `GET /animals/{id}/summary` ("No AI summary yet" while it answers 204).
- **Daily Inspection:** `POST` and `GET /animals/{id}/inspections` (the board and today's AM/PM status), `GET /animals/inspections/{id}` (record detail).
- **New Health Observation:** `POST /observations` (unlinked text, or a backend animal), `GET /observations/{id}`, `GET /animals/{id}/observations` (loaded for every animal: timeline, AI triage, Operations alerts).
- **Confirm AI result and AI triage:** `GET /observations/{id}/ai-result`, `POST /observations/{id}/route` (the server applies the case rule), `GET /observations/review-queue`. Until the server has an AI result (404), the app's rule-based mock AI fills in on the device so the result can still be confirmed; the decision is sent to the server either way.
- **Cases:** `GET /cases`, `GET /cases/{caseId}` (by case number), `PATCH /cases/{caseId}` (assign; add or tick follow-ups, sent as the full list), `POST /cases/{caseId}/close`. Backend cases also feed the Operations open-case count, the animal list's "unwell" and the routing choices. There are no endpoints for case notes, "mark as reviewed" or a manual reopen, so those are hidden on backend cases (a closed case is reopened by routing a related observation to it). There's no staff list either, so "Assign" offers the staff seen as assignees on backend cases, plus yourself.
- **Medication:** `GET /medication/animals`, `GET /animals/{id}/medication`, `POST /medication/administrations`.

With `EXPO_PUBLIC_DEMO_DATA=false` every screen shows only backend data. Still worked out on the device, as the backend has no endpoints for them: the Operations alerts, "Correct" (send to AI triage) on Confirm AI result, and the AI result until the server has one. Observation photos and videos are still placeholders (only exam photos upload), and push tokens (`/me/push-token`) need a push library, which the app doesn't have yet.

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

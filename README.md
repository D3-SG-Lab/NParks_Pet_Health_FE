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
- Real sign-in needs the `EXPO_PUBLIC_{OFFICER,CONTRACTOR}_OIDC_*` variables.

There is no backend yet: data comes from the in-memory mock in `src/mock/`.

## Commands

```bash
npm run build   # type-check (tsc --noEmit)
npm run lint    # expo lint
npm test        # jest
```

## Branches

`development` is the base branch. Feature work goes on `ai/<feature>` branches and is merged by pull request. After a PR merges, run `git checkout development && git pull` to get it locally.

## Docs

`docs/`: `Backlogs.xlsx` (requirements), `Wireframes.pdf`, `Product_Design.pdf` (design system) and `Mobile_App_Design.pdf` (screens).

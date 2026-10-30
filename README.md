# build-track

Expo React Native app for the Track screen: sync bank transactions from a mock API, show India-timezone monthly income and spend, and browse a searchable, filterable list with offline-friendly caching.

## Features

- Progressive history sync: latest IST month is ready first, remaining months continue in the background, then the changes feed runs
- Monthly income and spend cards computed locally in IST (`+05:30`), excluding own-account / self-transfers
- Month picker (previous / next and sheet), merchant search, category filters, sort, and debit / credit direction chips
- Transaction detail sheet (account nickname, Pending / Settled status, self-transfer note when applicable)
- Queued API GETs with exponential backoff on HTTP 429 / 500 / 503
- TanStack Query cache persisted to MMKV for 24 hours
- Light / dark UI following the system color scheme

## Tech stack

| Package | Version (from `package.json`) |
| --- | --- |
| Expo | `~58.0.21` |
| React Native | `0.88.0` |
| React | `19.3.0` |
| Expo Router | `~58.0.28` |
| TanStack Query | `^5.105.0` |
| `@tanstack/react-query-persist-client` | `^5.105.0` |
| `@tanstack/query-sync-storage-persister` | `^5.105.0` |
| Axios | `^1.21.0` |
| react-native-mmkv | `^4.3.2` |
| react-native-reanimated | `4.7.1` |
| react-native-gesture-handler | `~3.3.0` |
| TypeScript | `~6.0.3` |
| Jest / jest-expo | `~30.5.2` / `~58.0.13` |
| `@testing-library/react-native` | `^14.1.0` |

## Prerequisites

- **Node.js** `^22.13.0` (required by Expo SDK 58)
- **npm** (lockfile is `package-lock.json`)
- An **Android emulator**, **iOS simulator**, or a **physical device** on the same network as the mock API
- A **development build** — Expo Go is not supported (`react-native-mmkv` is not included in Expo Go)
- The mock API under `mock-api/` (Node 18+ is enough for the server alone)

## Getting started

### 1. Install

```bash
npm install
```

### 2. Run the mock API

```bash
node mock-api/server.js
```

Listens on `http://0.0.0.0:4010`. See [`mock-api/README.md`](mock-api/README.md) for endpoints.

### 3. Configure `EXPO_PUBLIC_API_URL`

Copy [`.env.example`](.env.example) to `.env` and set the URL for your target:

| Target | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Android emulator | `http://10.0.2.2:4010` |
| iOS simulator | `http://localhost:4010` |
| Physical device (same Wi‑Fi) | `http://<your-computer-LAN-IP>:4010` |

`.env` is gitignored. Restart Metro after changing the value.

### 4. Build and start the app

On a fresh machine, build and install a development client first (this compiles native modules such as MMKV):

```bash
npm run android
# or
npm run ios
```

Those commands also start Metro. For later sessions, after the native app is already installed:

```bash
npx expo start
```

Then open the already-installed development build (not Expo Go).

## Scripts / commands

| Purpose | Command | Notes |
| --- | --- | --- |
| Start Metro | `npm start` or `npx expo start` | Use after a development build is installed |
| Android native run | `npm run android` | Builds/installs the Android development client |
| iOS native run | `npm run ios` | Builds/installs the iOS development client |
| Tests | `npm test` | All suites should pass |
| Typecheck | `npm run typecheck` | Runs `tsc --noEmit` |
| Coverage (utils + api + client) | See [docs/TESTING.md](docs/TESTING.md) | Scope is not the whole `src/` tree |
| Lint | `npm run lint` (`expo lint`) | **No ESLint config** in the repo; running it may prompt to install ESLint |

## Project structure

| Path | Role |
| --- | --- |
| `src/app/` | Expo Router entry (`index` → Track screen, root layout with persisted QueryClient) |
| `src/components/` | Shared themed text / view |
| `src/constants/` | Theme tokens |
| `src/features/` | Feature code (transactions API, hooks, UI, utils, types) |
| `src/hooks/` | Color scheme and theme helpers |
| `src/lib/` | Axios client, TanStack Query client / persister, MMKV storage |
| `mock-api/` | Standalone Track API mock server and fixtures |

## More docs

- [Architecture](docs/ARCHITECTURE.md) — sync, money, filters, data flow
- [Testing](docs/TESTING.md) — commands, coverage scope, conventions, device checklist

## Known limitations

- No ESLint config in the repo
- `npx expo-doctor` reports `react-native` **0.88.0** vs expected **0.88.1** (left unchanged)
- Expo Go is not supported; use a development build (`npm run android` / `npm run ios`)

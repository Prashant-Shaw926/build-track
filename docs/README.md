# Track take-home — docs

## Run it (under five minutes)

Need Node 22+, npm, and an Android emulator / iOS simulator / phone on the same network. Expo Go won’t work (MMKV) — you need a development build.

```bash
# terminal 1 — app deps
npm install
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `.env`:

| Target | Value |
| --- | --- |
| Android emulator | `http://10.0.2.2:4010` |
| iOS simulator | `http://localhost:4010` |
| Physical device | `http://<your-LAN-IP>:4010` |

```bash
# terminal 2 — mock API
node mock-api/server.js

# terminal 1 — first time: native build + Metro
npm run android
# or: npm run ios
```

Later sessions (dev client already installed): `npx expo start`, then open the installed app — not Expo Go.

```bash
npm test          # Jest
npm run typecheck # tsc --noEmit
```

Full setup notes: [root README](../README.md).

## Write-ups

| Doc | What it is |
| --- | --- |
| [implementation.md](implementation.md) | How the Track screen is wired |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Sync, money, filters, list performance |
| [TESTING.md](TESTING.md) | Test commands and coverage scope |
| [decision-log.md](decision-log.md) | What I chose, what I rejected, why |
| [what-the-data-made-us-decide.md](what-the-data-made-us-decide.md) | Fixture/API facts that forced choices |
| [PR-review.md](PR-review.md) | Task 3 — review of PR #412 |
| [ai-disclosure.md](ai-disclosure.md) | Tools used + one case the model got wrong |
| [unfinished.md](unfinished.md) | What’s still open — no pretending |

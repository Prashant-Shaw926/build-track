# Implementation

Expo SDK 58 app (Expo Router, TanStack Query + MMKV, Axios) that loads the Track screen from the mock API under `mock-api/`.

## Data path

1. `EXPO_PUBLIC_API_URL` → Axios client (`src/lib/api/client.ts`) — GETs run one at a time; retries on 429 / 500 / 503.
2. Accounts + transactions queries (`useAccounts`, `useTransactions`).
3. Transactions: page `/v1/transactions` (limit 50, newest first), show the latest IST month when it’s ready, keep paging in the background, then apply `/v1/transactions/changes` when the list is complete.
4. Rows go through `normalizeTransactions` (canonical + legacy shapes).
5. `useTrackData` builds the month view, filters, and list rows.
6. `TrackScreen` renders the UI.

## What you see on screen

- Month picker (arrows + sheet)
- Income / spend for the selected month (local IST maths, not the summary endpoint)
- Search, category filters, sort, debit / credit chips
- FlatList of transactions
- Detail sheet (account nickname, Pending / Settled, self-transfer note when it applies)

## Where to look

| Area | Path |
| --- | --- |
| Screen | `src/features/transactions/components/track-screen.tsx` |
| Screen data | `src/features/transactions/hooks/use-track-data.ts` |
| Sync / paging | `src/features/transactions/api/transactions.api.ts` |
| Normalize | `src/features/transactions/utils/normalize-transaction.ts` |
| Month totals | `src/features/transactions/utils/month-totals.ts` |

Deeper sync and money rules: [ARCHITECTURE.md](ARCHITECTURE.md).  
How to test: [TESTING.md](TESTING.md).

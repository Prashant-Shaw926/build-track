# Architecture

Short notes on how the Track screen works and where each part lives.

## Pagination

`src/features/transactions/api/transactions.api.ts`

- Page size is 50 (`TRANSACTION_PAGE_LIMIT`).
- `fetchAllTransactionsWithToken` follows `next_cursor` until it is null.
- Rows that appear on two pages are skipped by transaction id (`seenIds`).
- If the same cursor comes back twice, the sync fails with an `ApiError`. The same check is used for the changes feed.

## Sync: full history, then changes

Main function: `loadTransactionSnapshot` (same file). Month readiness is in `utils/api-transaction-month.ts`.

The API returns newest first and can't filter by month. So to show the latest month quickly, I load pages one by one and save a partial snapshot as soon as the newest IST month is complete.

1. **First load or incomplete cache:** page through `/v1/transactions` and dedupe by id. After each page, work out which months are ready. When the latest month is ready, save a partial snapshot to the Query cache (`historyComplete: false`, no `syncToken`, with a `resumeCursor`) so the UI can render. Older months keep loading in the background. If the load is cancelled, the next one resumes from `resumeCursor`.
2. **History finished:** save `historyComplete: true` with the list's `sync_token`, then call `/v1/transactions/changes?since=<token>` and merge the result (`utils/apply-transaction-changes.ts`). If the changes call fails, keep the full list, set `changesSynced: false` and show `changesErrorMessage`.
3. **Cache is complete and has a token:** only call changes, then merge and store the new token.
4. **HTTP 410 on changes:** the token has expired. Do one full resync, then call changes again with the new token. There is no retry loop. If the full load fails after a 410, the error is shown and the old snapshot stays in the cache.
5. **Pull to refresh while still paging:** refresh accounts only and don't wait for or cancel the background load, so the spinner doesn't hang. Once history is complete, pull to refresh uses the changes feed.

**When is a month "ready"?** While paging, a month is ready once an older IST month has appeared. Once `historyComplete` is true, every month in the list is ready. Totals and rows for a month are shown only when it is ready, otherwise the loader stays.

**Merge rules** (`applyTransactionChanges`): a change is applied only if its `updated_at` is newer than the stored row. A newer `deleted: true` removes the row. New ids are inserted newest first.

## Data shapes and IST

`utils/normalize-transaction.ts` accepts two shapes:

- Canonical: `occurred_at`, `amount_minor`, and so on.
- Legacy: `txn_time` and a string `amount` in major units.

Rows that can't be parsed become normalization failures (id and reason) and are kept out of totals and the list.

IST handling is in `utils/month-totals.ts`. It adds a +5:30 offset (`IST_OFFSET_MS`) to UTC times. `indiaMonthKey` and `indiaDateParts` are used for month chips, list dates and detail timestamps (through `utils/track-month.ts`).

## Transfers between own accounts

`isOwnAccountTransfer` in `month-totals.ts` returns true when `counterparty.type === 'OWN_ACCOUNT'` or the legacy `linkedAccountLast4` is set.

These rows stay in the list and the detail sheet (with a note), but are left out of income and spend in `sumMonthMinor` and `formatMonthTotals`.

## Money

- Amounts are integer minor units everywhere. No float totals.
- `formatMinorDecimal` and `formatTransactionAmount` (`utils/format-amount.ts` and `month-totals.ts`) split amounts using integer maths and keep a leading `-` for negatives (`-105` becomes `-1.05`).
- INR or no currency: Indian grouping with `₹`. USD: `$`, plus an optional `₹` amount from `inrAmountMinor`. Other currencies: the code plus normal grouping.
- Month cards and amount sorting use the same rule (`rupeeMinor` in `utils/track-list.ts`): for INR or no currency use `amountMinor`, otherwise use `inrAmountMinor` if it exists.

## API client

`src/lib/api/client.ts`

- Axios, with `baseURL` from `EXPO_PUBLIC_API_URL` and a 15s timeout.
- All Track GET calls go through `apiGet`, which runs one request at a time.
- Retries happen only for 429, 500 and 503, up to 4 attempts. The wait is `2000 * 2^attempt` ms (2s, 4s, 8s), or longer if `Retry-After` says so.
- Network errors and other statuses, including 410, are not retried here.

## TanStack Query

`src/lib/query/query-client.ts` and `src/app/_layout.tsx`

- `staleTime` is 60s. `gcTime` and the persist `maxAge` are 24 hours (`QUERY_PERSIST_MAX_AGE_MS`).
- `retry: false` in Query, since retries are already handled in `apiGet`.
- `PersistQueryClientProvider` with an MMKV persister.
- If persisting fails, it logs the error and calls `queryPersister.removeClient()` so a broken cache can't block a fresh fetch.

`useTransactions` passes the cached snapshot to `loadTransactionSnapshot`, with an `onProgress` callback that calls `setQueryData` for partial snapshots. Once `historyComplete` is true and a `syncToken` exists, refreshes use the changes feed.

## From data to screen

`hooks/use-track-data.ts` combines `useAccounts` and `useTransactions`, normalizes the data, builds the month view and applies the filters.

- If the selected month isn't ready (and history isn't complete), the summary and list show the loading state and hide partial numbers.
- Months that are ready don't show the refresh spinner while background paging continues. `isRefetching` is ignored until `historyComplete`, unless the user pulled to refresh.
- Month, category, direction and sort changes apply immediately. Only search text is debounced (200 ms, `LIST_UPDATE_DELAY_MS`). Every effect path returns the same `clearDebounce` cleanup, so an old timer can't overwrite a newer filter.

`components/track-screen.tsx` brings together the month selector, summary cards, filters, list and detail sheet.

`useMonthlySummary` and `summary.api.ts` are still in the code and tested, but the Track cards don't use them. They show IST totals from ready months in the synced data.

## List performance

`components/transaction-list.tsx`

- `TransactionRow` is wrapped in `memo`.
- `keyExtractor` is defined once outside the component and uses `id`.
- `renderItem` uses `useCallback`.
- FlatList settings: `initialNumToRender={15}`, `maxToRenderPerBatch={10}`, `windowSize={11}`, and `removeClippedSubviews` everywhere except web.
- No `getItemLayout`, because row height changes (long merchant names, optional second amount, status), so fixed offsets would be wrong.

The shared bottom sheet (`components/bottom-sheet.tsx`) is a Modal with a slide animation, a title next to an × button, tap-outside to close, and a scroll hint for overflow. There is no drag to close.
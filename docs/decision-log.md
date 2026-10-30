# Decision log

Ten decisions I made while building the Track screen. For each one: what I did, what I didn't do, and why.

### 1. Load the full history, then sync with `/changes`

**Did:** Page through `/v1/transactions` to the end (dedupe by id), then refresh using `sync_token` and `/changes`.
**Didn't:** Use FlatList `onEndReached` to drive loading.
**Why:** The mock's pages overlap on the cursor, so if `onEndReached` fires twice with the same cursor, the same page gets added twice. That is the bug in PR #412. Loading everything and then syncing changes was safer.

### 2. Month cards calculated locally, not from `/v1/summary/months`

**Did:** Calculate income and spend from the synced list, grouped by IST month, leaving out transfers between the user's own accounts.
**Didn't:** Use the summary endpoint for the cards (blocker 5 in my PR review).
**Why:** I first agreed with that comment. Then I compared `summary_months.json` with the post-sync `checkpoint.json` and they don't match (the summary uses UTC months and treats transfers differently). A number that can't match the correct local total is worse than my own calculation. The summary hook is still in the repo, but the cards don't use it.

### 3. Own-account transfers stay in the list but not in the totals

**Did:** Show them in the list, leave them out of income and spend, and add a note on the detail sheet.
**Didn't:** Count every debit and credit as spend or income.
**Why:** The checkpoint does it this way too. Hiding them would make the history incomplete, and counting them would make spend look higher than it is.

### 4. Integer minor units everywhere

**Did:** Add up `amount_minor` as integers and only format when displaying.
**Didn't:** Do `amount_minor / 100` and add floats (blocker 4 in my review).
**Why:** Money shouldn't be summed as floats. Sorting also uses `amountMinor`, not the formatted text, otherwise `₹1,000` sorts before `₹200`.

### 5. Month keys use IST (+05:30), not a UTC slice

**Did:** Shift `occurred_at` by 5:30, then take the year and month.
**Didn't:** Use `occurred_at.slice(0, 7)`.
**Why:** `2026-08-31T21:00:00Z` is already September in India, but a UTC slice puts it in August. The fixture data has cases like this.

### 6. Show the latest month first

**Did:** Show the screen once the newest IST month is complete, and keep loading older months in the background.
**Didn't:** Wait for all ~4.6k rows, or show a month before its last page has loaded.
**Why:** Waiting for everything feels slow on a phone. Showing a month too early makes its income and spend numbers change as more pages arrive. A month counts as ready once its whole date range is in the synced data.

### 7. Sheets close with the × button or backdrop tap, no drag

**Did:** One shared bottom sheet, closed with × or a tap outside.
**Didn't:** Drag to dismiss on top of React Native `Modal`.
**Why:** Dragging fought with the Modal's open and close animation. The sheet flickered and sometimes got stuck half open. Tap-to-close is simpler and works every time. With more time I'd try a proper sheet library.

### 8. Cache for 24 hours, and keep data if a refresh fails

**Did:** TanStack Query with MMKV persistence. If a refresh fails, the last good data stays and a notice with Retry shows.
**Didn't:** Clear the list on error (blocker 2 in my review), or clear the cache on every 410.
**Why:** Wiping the list after one bad request leaves the user on a blank error screen. On a 410 I reload from scratch into a new snapshot without blanking the UI first.

### 9. API URL comes from env only

**Did:** Read it from `EXPO_PUBLIC_API_URL`.
**Didn't:** Hardcode `http://10.0.2.2:4010`.
**Why:** That address only works on the Android emulator. If the env var is missing, I'd rather the app fail clearly than quietly call the wrong host.

### 10. Pull-to-refresh spinner ignores background paging

**Did:** Don't tie the spinner to `isRefetching` until `historyComplete`, unless the user actually pulled to refresh.
**Didn't:** Connect the spinner directly to `isRefetching`.
**Why:** While older months keep loading, the query stays in refetching state, so the spinner kept spinning even though the first months were ready. I started with the standard Query flag, but it didn't fit this progressive loading.
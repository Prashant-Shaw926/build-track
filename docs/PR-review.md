PR #412 Review: Track, load transactions from the new API

Verdict: Request changes. Comments 1-7 should be fixed before merge. 8-10 can be follow-ups.

Blockers:
1. BLOCK: Pagination bug in load (useTransactions.ts). onEndReached can fire twice, and both calls use the same cursor, so the same page gets added twice. A slow load can also overwrite a newer refresh. Fix: use setTransactions(prev => ...), add an "already loading" guard, and dedupe by id.
2. BLOCK: Error handling wipes the list and gets the user stuck. The catch does setTransactions([]), so one failed page clears everything. error is never reset, and the whole screen is replaced by the error text with no retry. There is also no res.ok check. Fix: keep the old data, show a small error with a Retry button, and check res.ok.
3. BLOCK: sync_token and /changes are ignored. Deleted transactions never go away and updated ones (like pending to posted) stay old. Refresh only reloads page 1. Fix: save the sync_token and use /changes on refresh.
4. BLOCK: Wrong money math in monthTotal. It adds floats (amount_minor / 100), counts every debit whatever the status, and ignores currency. Fix: sum integer minor units, count only the right statuses, and handle currency.
5. BLOCK: Month totals come from partly loaded data. The backend already has /v1/summary/months. The totals here change as the user scrolls and may not match the backend. Fix: use the summary endpoint for header totals.
6. BLOCK: Months are grouped by UTC, not local time. occurred_at.slice(0, 7) puts late-night IST transactions in the wrong month. Fix: group by the local year and month.
7. BLOCK: Hardcoded http://10.0.2.2:4010. This only works on the Android emulator, not on iOS or a real phone, and plain http is blocked in Android release builds. Fix: take the base URL from config.

Can be follow-ups:
8. ALLOW: keyExtractor uses the index. Use t.id for rows and header-${month} for headers.
9. ALLOW: formatAmount is hardcoded. It uses en-US and a fixed ₹. Use Intl.NumberFormat('en-IN', { style: 'currency', currency }), and use the same formatter in the month header (which currently uses toFixed(2)).
10. ALLOW: Small things. The cursor isn't URL-encoded, the refresh spinner shows during pagination, there's no empty state, and item: any should be a proper type.


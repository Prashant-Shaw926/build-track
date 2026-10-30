# What the data made me decide

These choices came from what I found in the fixtures and the running mock server, not from preference.

## Pages overlap at the boundary

**Saw:** The last transaction of one page shows up again at the start of the next, so appending pages blindly gives duplicate ids.
**Did:** Dedupe by `id`, and throw an error if the cursor doesn't move forward.
**With more time:** Test pagination against the real server, both at normal speed and with rapid calls. Maybe ask the backend for a cursor that doesn't overlap.

## The changes feed is needed

**Saw:** `changes.json` has deleted rows, pending rows that became posted, and brand-new ids. Reloading only page 1 on refresh leaves the local list wrong.
**Did:** Keep the `sync_token`, merge updates by the newer `updated_at`, remove deleted rows, and re-page everything on a 410.
**With more time:** Show a small "N rows updated" message so changes aren't silent, and add a "full resync" button in settings.

## Summary endpoint doesn't match the checkpoint

**Saw:** `/v1/summary/months` and the post-sync checkpoint give different monthly totals. The summary uses UTC months and handles transfers differently.
**Did:** Don't use the summary for the Track cards. I calculate IST income and spend from the synced list. `useMonthlySummary` is still in the code but the UI doesn't use it.
**With more time:** Make the mock summary follow the checkpoint rules, or document it as approximate and never show it next to the synced numbers.

## Late UTC times fall into the next IST month

**Saw:** A UTC evening time on the last day of a month is already the next day in India.
**Did:** Use a fixed +05:30 offset for month keys and day labels, not the device locale and not a UTC slice.
**With more time:** Put this in one shared date helper used by the UI, tests and any future charts, so nobody brings back `.slice(0, 7)`.

## Transfers between own accounts look like spend

**Saw:** Transfer rows appear in the feed as normal debits and credits, but the checkpoint leaves them out of spend and income.
**Did:** Leave them out of the totals, keep them in the list, and label them on the detail sheet.
**With more time:** Add a "Hide transfers" filter, and mark them in the row itself, not only in the sheet.

## Two data shapes in the same file

**Saw:** The same fixture file has rows with `occurred_at` and `amount_minor`, and rows with `txn_time` and a string `amount`.
**Did:** Wrote a normalizer that accepts both. Rows that can't be parsed stay visible as failed rows, and I don't guess an amount for them.
**With more time:** Count how many rows use each shape in production, and clean up the mock data so the second shape can be removed.
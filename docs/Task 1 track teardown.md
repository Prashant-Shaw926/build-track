Track Screen Review

Oct 30, 2026 · Prashant Shaw

The Track screen needs more reliable transaction data first: wrong dates, vague category names and possible duplicate counting make the history hard to trust. Sorting, chart interaction and empty states come next.

What is wrong or confusing:

1. Transaction dates are wrong. After the first Gmail sync, many transactions show the sync date instead of the date they actually happened. Users cannot tell when they spent or received money.
Fix: Store the transaction date separately from the sync date, show the real date (and time when reliable), and use it for filtering and sorting. If the date is unknown, say so instead of showing the sync date.
2. The "Other" income category is vague. Under Income, "Other" holds credits, cashback and received payments, so the name does not tell users what is inside.
Fix: Use accurate names such as "Received" or "Other Income", and split clearly different transaction types instead of using one generic label.
3. Small pie chart segments are hard to select. Tapping a small segment usually selects a larger one (UPI or Other) and opens its transactions. The chart also gives no details for each segment.
Fix: Show the category name and amount or percentage when a segment is tapped, and add a legend or list below the chart so every category can be selected.
4. Expense Transactions cannot be sorted. Search and category filters exist, but there is no sorting.
Fix: Add Newest first, Oldest first, Amount high to low and Amount low to high. Sorting by date should use the real transaction date and should keep the user's search and filters.
5. Bottom sheet shows the screen behind it. When tapping Add, some text from the screen underneath shows near the system navigation area, which looks unfinished.
Fix: Handle system navigation insets and safe areas, and make sure the sheet background covers the full area.
6. Empty months show nothing useful. The Income tab is blank when a month has no income records.
Fix: Show "No income transactions recorded for this month", and tell "no income" apart from "data not synced".

Consistency checks:
• Use the same fonts, spacing and category selection behaviour in the Income and Expense tabs.
• Show clear loading, empty and error states.
• Show dates, amounts and category names the same way everywhere.
• Make filters and sorting easy to find.
• Make sure one transaction is never counted twice in category totals.

Three changes I would make first:
1. Fix transaction dates, categories and duplicates. Everything else on the screen, including totals, charts and sorting, depends on accurate data.
2. Add sorting and make the pie chart easy to use. These are the main ways users find and review transactions, and they should work for every category, large or small.
3. Add empty states and fix the bottom sheet. These are quick fixes that make the screen feel finished and stop users thinking it is broken.

Expected outcome:
Users can see where money came from, where it went, when each transaction happened and how it is categorised, even when data is incomplete or a category is small.
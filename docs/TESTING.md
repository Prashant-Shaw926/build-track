# Testing

## Commands

### Full suite

```bash
npm test
```

All suites should pass.

Equivalent with Watchman disabled (useful on Windows):

```bash
npm test -- --watchman=false
```

### Single file

```bash
npm test -- --watchman=false src/lib/api/client.test.ts
```

Replace the path with any `*.test.ts` / `*.test.tsx` under `src/`.

### Typecheck

```bash
npm run typecheck
```

### Coverage (scoped)

Coverage is intentionally limited to transaction utils, transaction API modules, and the shared Axios client — not hooks or components:

```bash
npm test -- --watchman=false --coverage --collectCoverageFrom="src/features/transactions/utils/**/*.ts" --collectCoverageFrom="src/features/transactions/api/**/*.ts" --collectCoverageFrom="src/lib/api/**/*.ts" --collectCoverageFrom="!**/*.test.ts" --coverageReporters=text-summary
```

As of 30 Oct 2026, for that scope:

| Metric | Value |
| --- | --- |
| Statements | **88.1%** (578 / 656) |
| Branches | **79.09%** (435 / 550) |
| Functions | **100%** (116 / 116) |
| Lines | **87.85%** (564 / 642) |

Do not treat this as whole-app coverage.

### IST under another timezone

```bash
# Unix / macOS
TZ=America/Los_Angeles npm test -- --watchman=false src/features/transactions/utils/month-totals.test.ts src/features/transactions/utils/track-month.test.ts src/features/transactions/utils/apply-transaction-changes.fixture.test.ts
```

On Windows PowerShell:

```powershell
$env:TZ='America/Los_Angeles'
npm test -- --watchman=false src/features/transactions/utils/month-totals.test.ts src/features/transactions/utils/track-month.test.ts src/features/transactions/utils/apply-transaction-changes.fixture.test.ts
Remove-Item Env:TZ
```

These IST-related suites should pass under `America/Los_Angeles` as well as the default timezone.

## What is covered

| Area | Test files (co-located) |
| --- | --- |
| Utils | `normalize-transaction`, `apply-transaction-changes` (+ fixture/checkpoint), `month-totals`, `track-month`, `track-list`, `format-amount`, `display-merchant-name` |
| API | `accounts.api`, `transactions.api` (+ fixture), `summary.api`, plus `src/lib/api/client` |
| Hooks | `use-accounts`, `use-transactions`, `use-monthly-summary`, `use-track-data` (including search debounce / instant filter races) |
| Components | `bottom-sheet`, `month-selector`, `transaction-controls`, `transaction-detail-sheet`, `transaction-list`, `direction-filter`, `summary-overview`, `track-status`, `track-failures` |
| Other | `query-client`, `storage` |

Hook and component tests run in the suite but are **outside** the coverage collect paths above.

## Conventions in this repo

- **Location:** tests sit next to the code as `*.test.ts` / `*.test.tsx` (plus `*.fixture.test.ts` where fixtures are loaded).
- **Timers:** `use-track-data` debounce tests use `jest.useFakeTimers()` and wrap state updates / `advanceTimersByTime` in `act(...)`, then restore real timers in `afterEach`.
- **TanStack Query smoke tests:** hook wrappers set `gcTime: 0`, then call `unmount()` and `queryClient.clear()` so Query’s garbage-collection timers do not leave open handles after the suite.
- **BottomSheet mocks:** `month-selector`, `transaction-controls`, and `transaction-detail-sheet` tests mock `@/features/transactions/components/bottom-sheet` so they assert selection / content without owning Modal / safe-area behavior. The real sheet is covered in `bottom-sheet.test.tsx`.

## Manual Android device checklist

1. Scroll **300+** rows: no blank rows or flicker. If flicker appears, try removing only `removeClippedSubviews` in `transaction-list.tsx` and retest.
2. Type in search, then quickly tap Income / Expense / another month: the list must match both the query and the new filter (no stale debounce overwrite).
3. Open the real month, category (Filters), and sort sheets: select an option, dismiss with the **×** close control or the backdrop (there is no drag-to-close).
4. Open a row’s detail sheet: account nickname is correct; own-account transfers show the self-transfer note.
5. Pull to refresh; force an error state (for example stop the mock API); use Retry and confirm recovery when the API is back.

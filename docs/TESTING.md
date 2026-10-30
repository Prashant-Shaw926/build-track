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
| Utils | `normalize-transaction`, `apply-transaction-changes` (+ fixture/checkpoint), `month-totals`, `track-month`, `track-list`, `format-amount`, `display-merchant-name`, `api-transaction-month` (ready-month rules) |
| API | `accounts.api`, `transactions.api` (+ fixture, progressive `onProgress` / resume), `summary.api`, plus `src/lib/api/client` |
| Hooks | `use-accounts`, `use-transactions`, `use-monthly-summary`, `use-track-data` (search debounce / instant filter races, progressive month readiness loaders) |
| Components | `bottom-sheet`, `month-selector`, `transaction-controls`, `transaction-detail-sheet`, `transaction-list`, `direction-filter`, `summary-overview`, `track-status`, `track-failures` |
| Other | `query-client`, `storage` |

Hook and component tests run in the suite but are **outside** the coverage collect paths above.


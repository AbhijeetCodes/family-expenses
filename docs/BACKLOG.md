# Backlog

Ideas from the October 2026 review, best value for effort first. Effort: S = under an hour, M = an afternoon, L = a day or more.

Done already: `@googleapis/sheets` instead of `googleapis` (faster cold starts), retry-safe adds, pinch-zoom and 16px inputs, Next.js 15.5.28 and next-auth beta.32 security updates.

## Checks and housekeeping

- [ ] **Check on a real iPhone** that pinch-zoom works and tapping an input no longer zooms the page. The browser preview can't show this.
- [ ] **Set up lint (S).** `npm run lint` has never been configured: it asks which config to create instead of running. Add `.eslintrc.json` with `next/core-web-vitals`, fix what it finds, and remember `next lint` is deprecated in Next 16 (move to the ESLint CLI then).
- [ ] **Remaining `npm audit` alerts (S).** After the October updates there are no critical alerts. What's left only runs at build time or isn't used:
  - `next-pwa`'s build tools (workbox, rollup, glob libraries). These go away with the Serwist switch below.
  - Next's built-in PostCSS (the fix is only in Next 16) and `sharp` (only used by `next/image`, which the app doesn't use).
  - `npm audit fix` without `--force` clears most of the rest. Run it, then type-check and build.

## Features and improvements

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Search across all months in History | S–M | Med |
| 2 | Tests for the money logic + a CI check | S–M | Med |
| 3 | A cheaper live-sync check | S–M | Med |
| 4 | Recurring bills in one tap | M | High |
| 5 | Category budgets | M | High |
| 6 | Replace `next-pwa` with Serwist | M | Med |
| 7 | Add expenses while offline | L | High on mobile |
| 8 | Undo after delete | M | Low–Med |

### 1. Search across all months in History
Search only covers the month on screen, because `HistoryView` only gets `monthExpenses`. When there's a search query, offer an "All months" scope ("When did we last pay the plumber?"). The server already has every row in memory, so this is a matter of passing more data down, or adding a small server action that searches.

### 2. Tests for the money logic + a CI check
There's no test suite. Add vitest for the pure functions where a regression would go unnoticed:
- `lib/forecast.ts`
- `normaliseDate` and cost parsing in `rowToExpense` (`lib/expenses.ts`)
- URL parsing in `lib/useFilterParams.ts`
- `identicalExpense` / the retry guard

Then add a GitHub Action that runs type-check, lint and the tests on every push.

### 3. A cheaper live-sync check
Every open tab re-reads the whole sheet about every 10 s (`LiveSync` → `getExpensesVersionAction`). All reads share one service account's quota of about 60 reads a minute. Fine today, but it grows with rows and open tabs.
- **Simple fix:** slow the poll to 30–60 s after a few unchanged checks, and reset to 10 s on focus or after a change.
- **Fuller fix:** probe the file's `modifiedTime` through the Google Drive API instead. That needs a Drive scope on the service account.

### 4. Recurring bills in one tap
Rent, the cook's salary and metro passes are entered by hand every month. The forecast (`lib/forecast.ts`) already treats expenses of ₹2,500 or more as "bills". Offer last month's bills that haven't appeared yet this month as pre-filled rows: tick to confirm, one save.

### 5. Category budgets
A per-category monthly budget, stored as a new column in the `Settings` tab, with the same pace bar as the Overview hero ("Food: ₹8.2k of ₹10k, on pace for ₹11k"). It would make the dashboard something you act on, not just read.

### 6. Replace `next-pwa` with Serwist
`next-pwa` 5.6 hasn't been updated since 2022, is webpack-only, and accounts for most of the remaining audit alerts. Serwist (`@serwist/next`) is its maintained successor. #7 depends on it.

### 7. Add expenses while offline
A weak signal at a shop means the expense fails and has to be remembered for later. Queue saves in IndexedDB and send them when the phone is back online, with a "1 pending" badge. Each queued add should go through the same retry-safe path (`isRetry`) so a flaky reconnect can't double-add.

### 8. Undo after delete
A toast with an Undo button after deleting, which re-adds the row. It would be nicer than the confirm step. Low priority: the confirm already prevents most accidents.

## Not worth doing yet
- **Stable IDs instead of row numbers:** `assertRowHolds` already makes edits and deletes safe when rows shift.
- **Reading only part of the sheet:** a full read stays cheap until several thousand rows.

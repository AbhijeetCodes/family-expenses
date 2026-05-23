# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (also runs type-check)
npm run lint     # ESLint
```

No test suite is set up yet. Type-checking runs implicitly via `next build`.

## Required environment variables

Copy `.env.example` → `.env.local` before running. All 8 variables are required — the app will crash at startup if any are missing. See `.env.example` for descriptions.

## Architecture

### Data flow

All reads and writes go through **server components / server actions only** — no API routes for data, no client-side Sheets calls. The Google service account credentials never reach the browser.

```
Browser → Next.js Server Action (app/actions.ts)
              → lib/expenses.ts or lib/settings.ts
                  → lib/sheets.ts (googleapis service account client)
                      → Google Sheets API
```

### Auth

`lib/auth.ts` configures Auth.js v5 with a Google provider. The `signIn` callback rejects any email not in the `ALLOWED_EMAILS` env var. `middleware.ts` exports the auth handler directly, protecting every route except `/login`, `/api/auth/*`, and static assets.

Every server action in `app/actions.ts` re-checks `auth()` server-side — do not rely solely on the middleware redirect.

### Google Sheets structure

Two tabs in the Sheet:

- **`Expenses`** — one row per expense; columns A–I: Date, Expense Type, App, Mode of Payment, Name, Cost, Paid By, 1 time, Tags. Data starts at row 2 (row 1 is the header). `rowIndex` in the `Expense` type is the 1-based sheet row number, used for updates and deletes.
- **`Settings`** — five columns (A–E): ExpenseTypes, Apps, PaymentModes, PaidBy, Tags. Each column is an independent list; row 1 is the header.

`lib/expenses.ts` maps between JS objects and sheet rows. Date normalisation (`normaliseDate`) handles several formats the sheet might contain, including Google serial dates.

Deleting a row uses `batchUpdate` with `deleteDimension` (not clearing the row) to avoid leaving blank rows that corrupt `rowIndex` references.

### Pages & rendering

All pages are `dynamic = 'force-dynamic'` (no caching) because data lives in Sheets and changes frequently. Dashboard aggregations (totals, chart data) are computed in the server component on each request — no separate aggregation endpoint.

`ExpenseForm` is the only shared stateful component; it handles both create (no `existing` prop) and edit (with `existing` prop) via the same server actions.

### Settings management

`lib/settings.ts` appends new values to the bottom of each Settings column and clears (does not delete) rows when removing values. The `getSettings()` call filters blank cells, so gaps in the column are harmless.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (also type-checks)
npm run lint     # ESLint
```

No test suite. Type-checking runs implicitly via `next build`.

After any change: `git add -A && git commit -m "..." && git push` — Vercel auto-deploys from `main` (~2 min). Production URL: `https://family-expenses-ten.vercel.app`.

## Required environment variables

Copy `.env.example` → `.env.local` before running. All 8 variables are required. See `.env.example` for where to find each value.

`ALLOWED_EMAILS` is a comma-separated list of Google email addresses with access (e.g. `a@gmail.com,b@gmail.com`). Change it in Vercel's Environment Variables and redeploy to add/remove family members — no code change needed.

## Architecture

### Data flow

All reads and writes go through **server components / server actions only** — no API routes for data, no client-side Sheets calls. Service account credentials never reach the browser.

```
Browser → Next.js Server Action (app/actions.ts)
              → lib/expenses.ts or lib/settings.ts
                  → lib/sheets.ts (googleapis service account client)
                      → Google Sheets API
```

### Auth

`lib/auth.ts` configures Auth.js v5 with a Google provider. The `signIn` callback rejects any email not in `ALLOWED_EMAILS`. `middleware.ts` exports the auth handler directly, protecting every route except `/login`, `/api/auth/*`, and static assets.

Every server action in `app/actions.ts` re-checks `auth()` server-side — do not rely solely on middleware.

### Google Sheets structure

**`Expenses` tab** — columns A–J, row 1 is the header, data from row 2:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Month | Date | Expense Type | App | Mode of Payment | Name | Cost | Paid By | 1 time | Tags |

Column A (`Month`, e.g. `2026-05`) is auto-computed from the date on write. `rowIndex` in the `Expense` type is the 1-based sheet row number and must stay accurate — deletes use `batchUpdate` with `deleteDimension` (not row-clearing) to prevent row shifts that would corrupt all subsequent `rowIndex` values.

**`Settings` tab** — five columns (A–E): `ExpenseTypes`, `Apps`, `PaymentModes`, `PaidBy`, `Tags`. Each is an independent list; row 1 is the header. `lib/settings.ts` appends to the bottom on add, clears the cell (leaves a gap) on delete — `getSettings()` filters blanks so gaps are harmless.

### Dashboard architecture

`app/page.tsx` is a thin server component: it fetches `thisMonthExpenses` and `prevMonthExpenses` from Sheets, then renders `<Dashboard>`. All aggregation (chart data, totals, filter application) happens client-side inside `components/Dashboard.tsx`.

`Dashboard.tsx` owns all interactive state:
- **Five filter dropdowns** (Type, Paid By, App, Mode, Tags) — each is a `Set<string>`; empty set = show all, non-empty = show only matching. The same filter state drives both the Overview charts and the Transactions list.
- **`excludeOneTime` toggle** — also shared across both tabs.
- **Sort state** (`sortKey`, `sortDir`) — only applies to the Transactions tab.
- **`showComparison` toggle** — switches the category donut to a grouped bar (`CategoryCompare`).

`FilterDropdown.tsx` is a self-contained multi-select checkbox dropdown. Pass `selected: Set<string>` and `onChange`; it manages its own open/close state with a mousedown-outside listener.

### Pages & rendering

All pages are `dynamic = 'force-dynamic'`. `ExpenseForm` handles both create (no `existing` prop) and edit (with `existing`) via the same server actions in `app/actions.ts`.

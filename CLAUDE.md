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

`ALLOWED_EMAILS` is a comma-separated list of Google email addresses with access. Change it in Vercel's Environment Variables and redeploy to add/remove family members — no code change needed.

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

### Design tokens

Defined in [tailwind.config.ts](tailwind.config.ts). Use these semantic tokens — do not introduce raw `slate-*`, `green-*`, `red-*` etc.

| Token | Hex | Use |
|---|---|---|
| `base` | `#10121D` | Page background |
| `surface` | `#1A1D2D` | Cards, sticky headers, dropdowns |
| `surface2` | `#252836` | Hover/inner elements, input bg, pills |
| `divider` | `#262A3D` | Borders, rule lines |
| `accent` / `accent-2` | `#00D689` / `#00B575` | Primary CTA, brand, success |
| `ink` / `muted` / `mutedDim` | `#FFFFFF` / `#94A3B8` / `#64748B` | Primary / secondary / tertiary text |
| `up` / `down` | `#22C55E` / `#EF4444` | Positive / negative trends, destructive |

Common utility classes in [app/globals.css](app/globals.css): `card`, `btn-primary`, `btn-secondary`, `input-field`, `label`, `page-header`, `pill`, `pill-default`, `pill-active`. Prefer these over inline className stacks for consistency.

### Dashboard architecture

[app/page.tsx](app/page.tsx) is a thin server component: it fetches `thisMonthExpenses` and `prevMonthExpenses` from Sheets, then renders `<Dashboard>`. All aggregation happens client-side inside [components/Dashboard.tsx](components/Dashboard.tsx).

**Layout:** desktop uses a CSS grid `[1fr_400px]` — left column is a 2×2 analytics card grid, right column is a sticky scrollable transaction sidebar. Mobile collapses to a single column with a FAB. No tabs.

**State owned by Dashboard:**
- Five filter Sets (`excludedTypes`, `excludedApps`, `excludedModes`, `excludedPaidBy`, `excludedTags`) — **inverted logic**: empty = show everything, non-empty = those values are hidden. Filter dropdowns default to all items checked; unchecking hides.
- `excludeOneTime` boolean
- `showComparison` (toggles `CategoryCard` between pie and grouped bars)
- `sortKey`, `sortDir` for the transaction list

Filter state drives both analytics cards and the transaction list — all share the same `filtered` derivation.

### Card components ([components/cards/](components/cards/))

All cards are wrapped in `React.memo` so toggling a filter only re-renders cards whose data props actually changed. The Dashboard passes pre-computed memoized data via `useMemo`, and handlers via `useCallback`, so referential identity is preserved across renders.

- `OverviewCard` — total + trend pill + month-end linear forecast (only shown when viewing the current month: `(total / day-of-month) * days-in-month`)
- `PaidByCard` — custom horizontal progress bars + avatar pile (no Recharts; faster, matches mockup)
- `CategoryCard` — wraps `CategoryPie` or `CategoryCompare` based on `showComparison`
- `DailyTrendCard` — wraps `DailyTrend`
- `TransactionList` — virtualized list (see below)

### Charts ([components/charts/](components/charts/))

All Recharts components have `isAnimationActive={false}` — animations are expensive at every filter change. Use CSS transitions on chart containers instead if needed.

`CategoryPie` groups any slice representing **less than 4%** of total spend into a single gray "Other" bucket. This prevents DOM bloat when a month has many small categories.

Chart colors come from `colorForString()` in [components/icons.tsx](components/icons.tsx) — a deterministic hash → 8-color palette. The same function colors `CategoryIcon`, `AvatarBadge`, and `PaidByCard` bars, so a category looks consistent across the whole UI.

### Virtualized transaction list

[components/cards/TransactionList.tsx](components/cards/TransactionList.tsx) uses `react-window` `FixedSizeList` with 72px rows. Below `VIRTUALIZE_THRESHOLD` (30) it falls back to a plain divided list — virtualization overhead isn't worth it for short lists. Container height is measured with `ResizeObserver` so the sidebar fills available vertical space without a fixed-px hack.

Individual row component (`Row`) is also `memo`-wrapped — keeps scroll smooth on large lists.

### Pages & rendering

All pages are `dynamic = 'force-dynamic'`. `ExpenseForm` handles both create (no `existing` prop) and edit (with `existing`) via the same server actions in `app/actions.ts`.

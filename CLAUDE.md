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

`getSheetsClient()` and `getTabSheetId()` in [lib/sheets.ts](lib/sheets.ts) are **module-scope singletons** — the `GoogleAuth` JWT client and the per-tab `sheetId` lookup are cached for the lifetime of the serverless instance. Never call `sheets.spreadsheets.get()` just to look up a tab's `sheetId`; use `getTabSheetId(TAB_NAME)`.

### Caching & write invariants

`getAllExpenses()` and `getSettings()` use a **60-second in-memory TTL cache** (per serverless instance). This is the main reason repeat navigation feels fast — most `force-dynamic` page loads inside a session hit the cache, not Sheets.

**Critical invariant:** any server action that mutates Sheets data **must** bust the matching cache, otherwise users see stale data for up to 60s:

- Writes to the `Expenses` tab → call `invalidateExpensesCache()` from [lib/expenses.ts](lib/expenses.ts)
- Writes to the `Settings` tab (including `promoteLookupValues`) → call `invalidateSettingsCache()` from [lib/settings.ts](lib/settings.ts)

Call them **alongside** `revalidatePath()`, not instead of — `revalidatePath` only busts Next.js's render cache, not our in-memory data cache. See every mutation handler in [app/actions.ts](app/actions.ts) for the pattern.

Independent writes in the same action should run in `Promise.all` (see `createExpenseAction` / `updateExpenseAction` — `addExpense` and `promoteLookupValues` run concurrently, so the form waits for the slower call, not the sum).

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

**Layout:** desktop uses a CSS grid `[1fr_400px]` — left column is a 2×2 analytics card grid, right column is a sticky scrollable transaction sidebar. Mobile collapses to a single column with a FAB. No tabs. The header uses `relative` + `absolute left-1/2 -translate-x-1/2` to keep the month nav dead-centred on all viewports; the desktop right cluster (Add Expense + username) uses `ml-auto`.

**State owned by Dashboard:**
- Five filter Sets (`excludedTypes`, `excludedApps`, `excludedModes`, `excludedPaidBy`, `excludedTags`) — **inverted logic**: empty = show everything, non-empty = those values are hidden. Filter dropdowns default to all items checked; unchecking hides.
- `excludeOneTime` boolean — **defaults to `true`** so big rare purchases (rent, deposits) don't skew the monthly total on first open.
- `showComparison` (toggles `CategoryCard` badge column between proportion % and delta % vs last month)
- `sortKey`, `sortDir` for the transaction list
- `selectedDate: string | null` — set when the user clicks a day on the Daily Spending chart

**Two derived filter layers** — analytics cards (Overview, PaidBy, Category, DailyTrend) all consume `filtered` (the global filter set). The sidebar has a second layer: `sidebarFiltered = selectedDate ? filtered.filter(e => e.date === selectedDate) : filtered`. This means selecting a day scopes only the sidebar list, never the charts — so the user keeps full-month context while drilling in.

`handleSelectDay` is viewport-aware: on desktop (≥ 1024 px / Tailwind `lg`) it sets `selectedDate` in place; on mobile it `router.push`es to `/expenses?month=YYYY-MM&date=YYYY-MM-DD` instead (the sidebar is `hidden lg:flex` so there's nothing to filter in place).

### Card components ([components/cards/](components/cards/))

All cards are wrapped in `React.memo` so toggling a filter only re-renders cards whose data props actually changed. The Dashboard passes pre-computed memoized data via `useMemo`, and handlers via `useCallback`, so referential identity is preserved across renders.

- `OverviewCard` — total + trend pill + month-end linear forecast (only shown when viewing the current month: `(total / day-of-month) * days-in-month`)
- `PaidByCard` — custom horizontal progress bars + avatar pile (no Recharts; faster, matches mockup)
- `CategoryCard` — wraps `CategoryBars`; passes `showComparison` to switch badge mode
- `DailyTrendCard` — wraps `DailyTrend`; accepts `onSelectDay?: (day: string) => void` which it forwards straight through to the chart

The transaction list is **not** a separate card component — it lives inline inside the `<aside>` in `Dashboard.tsx` (desktop only, `hidden lg:flex`). `HistoryView.tsx` has its own independent inline list for the `/expenses` page; it reads `?date=` from `useSearchParams` on mount to pre-filter to a specific day (populated by the mobile drill-down path).

### Charts ([components/charts/](components/charts/))

`CategoryBars` is a pure-CSS horizontal bar list — no Recharts, imported directly. Each row renders a `CategoryGlyph` icon chip, category name, a proportional bar, ₹ value, and a badge. Badge shows proportion % by default; when `showComparison` is true it shows a colored delta % vs last month (more spent = red `down`, less = green `up`). Slices under **4%** of total are bucketed into a gray "Other" row.

`DailyTrend` uses Recharts and is loaded via `next/dynamic` with `ssr: false` from inside `DailyTrendCard`. This keeps Recharts (~200–300 KB) off the initial JS bundle. Any new Recharts component should follow the same pattern with a fixed-height skeleton in the `loading` prop to avoid layout shift. All Recharts components use `isAnimationActive={false}` — use CSS transitions instead if animation is needed.

`DailyTrend` wires click to `<AreaChart onClick>`, not the tooltip. Do not move it to the tooltip — Recharts moves the tooltip as the cursor approaches it, making it unclickable in practice.

Colors come from `colorForString()` in [components/icons.tsx](components/icons.tsx) — a deterministic hash → 8-color palette. The same function drives `CategoryGlyph` chip backgrounds, `CategoryBars` bars, `AvatarBadge`, and `PaidByCard` bars, so a category/person looks consistent across the whole UI.

`CategoryGlyph` (also in [components/icons.tsx](components/icons.tsx)) maps a category name to a clean SVG icon via case-insensitive keyword matching (e.g. "rent" → home, "health" → cross, "grocery" → cart). Unrecognised names fall back to a generic circle glyph.

### Freeform lookup values (Expense Type / App / Payment Mode)

These three fields in `ExpenseForm.tsx` use `<input type="text" list="...">` + `<datalist>` instead of a `<select>`. The browser renders a native autocomplete popup from the existing Settings values; the user can also type anything freeform.

On form submit, `app/actions.ts` calls `promoteLookupValues()` which calls `addSettingValues()` from `lib/settings.ts`. That function does a **single read** of the Settings tab, deduplicates case-insensitively, and issues a **single `batchUpdate`** write — so a new value typed by the user silently appears as a suggestion next time without any manual Settings management.

`PaidBy` and `Tags` intentionally stay curated (`<select>` and chip multi-select respectively) — typos there corrupt expense attribution.

### Pages & rendering

All pages are `dynamic = 'force-dynamic'`. The in-memory TTL cache (see *Caching & write invariants*) is what keeps these cheap — `force-dynamic` re-runs the React tree on every request, but the underlying Sheets fetch usually hits the cache.

`ExpenseForm` handles both create (no `existing` prop) and edit (with `existing`) via the same server actions in `app/actions.ts`. **Form submit navigates first, then awaits the server action**: `router.push('/')` fires immediately on Save/Delete, the action runs inside `startTransition`, and `router.refresh()` pulls fresh data when it resolves. The user never blocks on the Sheets round-trip. Errors after navigation are logged to `console.error` — don't add UI that depends on validation throwing back to the form.

### Branding & PWA icons

The brand is a **money jar with gold/silver coins** on the `base #10121D` background. All icons are generated by a single pure-stdlib Python script: [scripts/gen-icons.py](scripts/gen-icons.py). Run it after any icon design change:

```bash
python3 scripts/gen-icons.py
```

It writes:
- `public/icons/icon-192.png` and `icon-512.png` (referenced from `manifest.json`, marked `"purpose": "any maskable"` so Android shows the full design instead of cropping to a circle)
- `public/apple-touch-icon.png` (180×180, for iOS home-screen install)
- `public/favicon.png` (32×32, browser tab)

The in-app icon component is `JarIcon` (also exported as `WalletIcon` alias for back-compat) in [components/icons.tsx](components/icons.tsx) — used in the dashboard header and login page. Keep the on-device icon and the in-app icon visually consistent.

`SignOutButton` lives in the Settings page Account card (bottom of [app/settings/page.tsx](app/settings/page.tsx)), not in the dashboard header.

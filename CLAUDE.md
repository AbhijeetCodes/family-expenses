# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Start dev server at http://localhost:3000
npm run build       # Production build (also type-checks)
npm run lint        # ESLint
npm run type-check  # tsc --noEmit only (faster than a full build)
```

No test suite.

After any change: `git add -A && git commit -m "..." && git push` — Vercel auto-deploys from `main` (~2 min). Production URL: `https://family-expenses-ten.vercel.app`. GitHub repo: `https://github.com/AbhijeetCodes/family-expenses` (`gh` CLI is not installed — create PRs by pushing the branch and opening the GitHub URL).

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

`getAllExpenses()` and `getSettings()` use an **in-memory TTL cache** (per serverless instance, default 60 s, overridable via `EXPENSES_CACHE_TTL_MS` / `SETTINGS_CACHE_TTL_MS` env vars). This is the main reason repeat navigation feels fast — most `force-dynamic` page loads inside a session hit the cache, not Sheets.

Both functions also **coalesce concurrent cache-miss requests**: the second caller awaits the first's in-flight `Promise` instead of firing a duplicate Sheets request.

**Critical invariant:** any server action that mutates Sheets data **must** bust the matching cache, otherwise users see stale data for up to 60 s:

- Writes to the `Expenses` tab → call `invalidateExpensesCache()` from [lib/expenses.ts](lib/expenses.ts)
- Writes to the `Settings` tab (including `promoteLookupValues`) → call `invalidateSettingsCache()` from [lib/settings.ts](lib/settings.ts)

Do **not** call `revalidatePath()` — all pages are `force-dynamic`, so it is a no-op. The in-memory cache invalidation above is the only bust that matters.

Independent writes in the same action should run in `Promise.all` (see `createExpenseAction` / `updateExpenseAction` — `addExpense` and `promoteLookupValues` run concurrently). `promoteLookupValues` is only called (and `invalidateSettingsCache` only fired) when the user actually typed a new lookup value; common datalist picks are free.

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

**Filter/sort state** lives in the URL (not component `useState`) via the `useFilterParams` hook (`lib/useFilterParams.ts`). This means filters survive navigation between Dashboard and `/expenses`, are bookmarkable, and browser back/forward works. URL keys are terse single letters (`t`, `a`, `m`, `p`, `g`, `one`, `sort`, `dir`, `date`). `month` is owned by the server component and preserved untouched. Filter updates use `router.replace` with `{ scroll: false }` so the back button still leaves the page, not just changes a filter.

- Five excluded-value Sets (`excludedTypes`, `excludedApps`, `excludedModes`, `excludedPaidBy`, `excludedTags`) — **inverted logic**: empty = show everything, non-empty = those values are hidden.
- `excludeOneTime` — Dashboard default `true` (hides big one-offs), HistoryView default `false`.
- `showComparison` (toggles `CategoryCard` badge column — proportion % vs delta % vs last month). Owned by Dashboard local `useState`, not URL-backed.
- `sortKey`, `sortDir`, `selectedDate` — URL-backed via `useFilterParams`.

**Two derived filter layers** — analytics cards consume `filtered` (global filter set). The sidebar applies a second pass: `sidebarFiltered = selectedDate ? filtered.filter(e => e.date === selectedDate) : filtered`. Selecting a day scopes only the sidebar list, never the charts.

`handleSelectDay` uses `useMediaQuery('(min-width: 1024px)')` from `lib/useMediaQuery.ts` (not `window.matchMedia` per click). On desktop it calls `setSelectedDate(day)`; on mobile it `router.push`es to `/expenses?month=YYYY-MM&date=YYYY-MM-DD`.

### Card components ([components/cards/](components/cards/))

All cards are wrapped in `React.memo` so toggling a filter only re-renders cards whose data props actually changed. The Dashboard passes pre-computed memoized data via `useMemo`, and handlers via `useCallback`, so referential identity is preserved across renders.

- `OverviewCard` — total + trend pill + month-end linear forecast (only shown when viewing the current month: `(total / day-of-month) * days-in-month`)
- `PaidByCard` — custom horizontal progress bars + avatar pile (no Recharts; faster, matches mockup)
- `CategoryCard` — wraps `CategoryBars`; passes `showComparison` to switch badge mode
- `DailyTrendCard` — wraps `DailyTrend`; accepts `onSelectDay?: (day: string) => void` which it forwards straight through to the chart

The transaction list is rendered by the shared `components/TransactionList.tsx` component. Both `Dashboard.tsx` (sidebar) and `HistoryView.tsx` (/expenses page) use it. Props: `expenses`, `showTags?`, `density?: 'compact' | 'comfortable'`, `dividerTone?: 'soft' | 'standard'`. The component is wrapped in `React.memo` and uses `formatINR` for consistent currency display.

### Charts ([components/charts/](components/charts/))

`CategoryBars` is a pure-CSS horizontal bar list — no Recharts, imported directly. Each row renders a `CategoryGlyph` icon chip, category name, a proportional bar, ₹ value, and a badge. Badge shows proportion % by default; when `showComparison` is true it shows a colored delta % vs last month (more spent = red `down`, less = green `up`). Slices under **4%** of total are bucketed into a gray "Other" row.

`DailyTrend` uses Recharts and is loaded via `next/dynamic` with `ssr: false` from inside `DailyTrendCard`. This keeps Recharts (~200–300 KB) off the initial JS bundle. Any new Recharts component should follow the same pattern with a fixed-height skeleton in the `loading` prop to avoid layout shift. All Recharts components use `isAnimationActive={false}` — use CSS transitions instead if animation is needed.

`DailyTrend` wires click to `<AreaChart onClick>`, not the tooltip. Do not move it to the tooltip — Recharts moves the tooltip as the cursor approaches it, making it unclickable in practice.

Colors come from `colorForString()` in [components/icons.tsx](components/icons.tsx) — a deterministic hash → 8-color palette. The same function drives `CategoryGlyph` chip backgrounds, `CategoryBars` bars, `AvatarBadge`, and `PaidByCard` bars, so a category/person looks consistent across the whole UI.

`CategoryGlyph` (also in [components/icons.tsx](components/icons.tsx)) maps a category name to a clean SVG icon via case-insensitive keyword matching (e.g. "rent" → home, "health" → cross, "grocery" → cart). Unrecognised names fall back to a generic circle glyph. The internal `glyphFor()` helper is memoized with a `Map<string, string>` so repeated calls for the same category name are O(1).

### Freeform lookup values (Expense Type / App / Payment Mode)

These three fields in `ExpenseForm.tsx` use `<input type="text" list="...">` + `<datalist>` instead of a `<select>`. The browser renders a native autocomplete popup from the existing Settings values; the user can also type anything freeform.

On form submit, `app/actions.ts` calls `promoteLookupValues()` which calls `addSettingValues()` from `lib/settings.ts`. That function does a **single read** of the Settings tab, deduplicates case-insensitively, and issues a **single `batchUpdate`** write — so a new value typed by the user silently appears as a suggestion next time without any manual Settings management.

`PaidBy` and `Tags` intentionally stay curated (`<select>` and chip multi-select respectively) — typos there corrupt expense attribution.

### Route map

| Route | Page file | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Dashboard — server component, renders `<Dashboard>` + FAB |
| `/add` | `app/add/page.tsx` | New expense — renders `<ExpenseForm>` + `<BottomNav>` |
| `/expenses` | `app/expenses/page.tsx` | History — renders `<HistoryView>` + `<BottomNav>` |
| `/expenses/[rowIndex]` | `app/expenses/[rowIndex]/page.tsx` | Edit expense — renders `<ExpenseForm existing={...}>` + `<BottomNav>` |
| `/settings` | `app/settings/page.tsx` | Settings — renders `<SettingsSection>` cards + `<BottomNav>` |
| `/login` | `app/login/page.tsx` | Login — unprotected, renders Google sign-in button |

`BottomNav` (`components/BottomNav.tsx`) is the mobile-only tab bar (hidden on `lg:`). It appears on every page *except* `/` — the dashboard uses a floating "+" FAB instead. `SettingsSection` (`components/SettingsSection.tsx`) uses `useTransition` + local state for optimistic UI: it updates the displayed list immediately and fires the server action in the background.

### Pages & rendering

All pages are `dynamic = 'force-dynamic'`. The in-memory TTL cache (see *Caching & write invariants*) is what keeps these cheap — `force-dynamic` re-runs the React tree on every request, but the underlying Sheets fetch usually hits the cache.

`ExpenseForm` handles both create (no `existing` prop) and edit (with `existing`) via the same server actions in `app/actions.ts`. **Form submit awaits the action first, then navigates**: `await createExpenseAction(...)` completes before `router.push('/')`, so the dashboard never lands on stale data. The ~300 ms latency is surfaced as a "Saving…" spinner. Errors caught in the `try/catch` render an inline error message in the form — don't restructure this to fire-and-navigate.

### Shared helpers (`lib/`)

| File | Exports | Purpose |
|---|---|---|
| `lib/format.ts` | `formatINR(n, opts?)` | Indian-locale number formatting (no ₹ symbol — callers prepend it). Default: whole rupees. Pass `{ decimals: 2 }` for paise. Use this instead of `.toLocaleString` calls. |
| `lib/utils.ts` | `unique(arr)` | Dedup + sort a `string[]`, filtering out empty strings. |
| `lib/date.ts` | `filterByMonth(expenses, monthStr)` | Filter an `Expense[]` to rows whose `date` starts with `YYYY-MM`. Used in server components; avoids duplicating the prefix check. |
| `lib/types.ts` | `SortKey`, `SortDir` | Shared sort-direction types used by `useFilterParams`, `Dashboard`, and `HistoryView`. |
| `lib/useFilterParams.ts` | `useFilterParams(defaults)` | URL-backed filter + sort state hook. Returns `FilterState & FilterActions`. Use in any client component that needs filter/sort UI. `month` param is never touched. |
| `lib/useMediaQuery.ts` | `useMediaQuery(query)` | SSR-safe `window.matchMedia` wrapper: returns `false` on server, updates reactively via `addEventListener('change')` on the client. |

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

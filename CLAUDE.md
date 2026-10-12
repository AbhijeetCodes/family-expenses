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

### Caching, live sync & write invariants

`getAllExpenses()` uses a **stale-while-revalidate in-memory cache** (per serverless instance) in [lib/expenses.ts](lib/expenses.ts):

- age < `EXPENSES_CACHE_TTL_MS` (default 5 s) → served from memory
- age < `EXPENSES_MAX_STALE_MS` (default 5 min) → served from memory instantly, Sheets re-read in the background (kept alive with `after()`)
- older / empty → blocks on a Sheets read

Concurrent reads coalesce onto one in-flight `Promise`, but only if no write has landed since that read started (`_generation` guard); a read that started before a write never overwrites the cache.

**Live sync (sheet → app):** each cache entry carries a `version` (FNV hash of all rows). `/` and `/expenses` render `<LiveSync version={…}>` ([components/LiveSync.tsx](components/LiveSync.tsx)), which calls `getExpensesVersionAction()` on mount, every 10 s while visible, and on focus/online. That action forces a read ≤3 s old; if the version differs, the client calls `router.refresh()`. This is how rows typed directly into the sheet appear in the app.

**Write invariant (app → sheet):** `addExpense` / `updateExpense` / `deleteExpense` **patch the cache in place** (`patchCache`), so the page you land on after saving renders from memory with no Sheets read. Delete shifts later `rowIndex` values down by one, mirroring the sheet. Any new function that writes the `Expenses` tab must call `patchCache` or `invalidateExpensesCache()`.

`getSettings()` keeps a plain 60 s TTL (`SETTINGS_CACHE_TTL_MS`). Writes to the `Settings` tab (including `promoteLookupValues`) → call `invalidateSettingsCache()` from [lib/settings.ts](lib/settings.ts).

Cost is written as a JSON number and the one-time flag as a boolean (still `valueInputOption: 'RAW'`, so nothing is parsed as a formula), so they land as numeric / TRUE-FALSE cells that work with SUM and filters. `rowToExpense` strips currency symbols and separators when parsing cost.

**Client router cache:** `next.config.js` sets `experimental.staleTimes.dynamic = 30`, so revisiting a tab is instant. Anything that mutates data must call `router.refresh()` (clears that cache) **before** `router.push()` — see `ExpenseForm` and `SettingsSection`. `<LiveSync>` corrects any stale cached page on mount. Do not call `revalidatePath()`; it adds a server re-render to the action response and isn't needed.

Independent writes in the same action should run in `Promise.all` (see `createExpenseAction` / `updateExpenseAction` — `addExpense` and `promoteLookupValues` run concurrently). `promoteLookupValues` is only called (and `invalidateSettingsCache` only fired) when the user actually typed a new lookup value; common datalist picks are free.

### Auth

`lib/auth.ts` configures Auth.js v5 with a Google provider. The `signIn` callback rejects any email not in `ALLOWED_EMAILS`, and the `jwt` callback re-checks it on every session read (returns `null` → session cleared), so removing an email also revokes existing sessions. `middleware.ts` exports the auth handler directly; the `authorized` callback is what makes it redirect signed-out users (without it Auth.js lets everything through). Its matcher skips `/login`, `/api/auth/*`, Next internals and static files in `public/` (icons must load before sign-in).

Every server action in `app/actions.ts` re-checks `auth()` server-side — do not rely solely on middleware.

### Google Sheets structure

**`Expenses` tab** — columns A–J, row 1 is the header, data from row 2:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Month | Date | Expense Type | App | Mode of Payment | Name | Cost | Paid By | 1 time | Tags |

Column A (`Month`, e.g. `2026-05`) is auto-computed from the date on write. `rowIndex` in the `Expense` type is the 1-based sheet row number and must stay accurate — deletes use `batchUpdate` with `deleteDimension` (not row-clearing) to prevent row shifts that would corrupt all subsequent `rowIndex` values. Because rows can still shift underneath an open page (a row inserted/deleted in the sheet or by another family member), `updateExpense` / `deleteExpense` take the expense as the form loaded it and re-read that row first (`assertRowHolds`); on a mismatch they throw `RowConflictError`, which the actions return as `{ error }` (thrown messages are redacted in production).

Settings writes are read-modify-write, so `addSettingValues` / `deleteSettingValue` run through a per-instance promise chain (`serialized`) — concurrent adds would otherwise pick the same empty cell.

**`Settings` tab** — five columns (A–E): `ExpenseTypes`, `Apps`, `PaymentModes`, `PaidBy`, `Tags`. Each is an independent list; row 1 is the header. `lib/settings.ts` appends to the bottom on add, clears the cell (leaves a gap) on delete — `getSettings()` filters blanks so gaps are harmless.

### Design tokens

Defined in [tailwind.config.ts](tailwind.config.ts). Use these semantic tokens — do not introduce raw `slate-*`, `green-*`, `red-*` etc.

| Token | Hex | Use |
|---|---|---|
| `base` | `#10121D` | Page background (sticky headers/nav use `bg-base/90` + blur) |
| `well` | `#0C0E17` | Inset fills: inputs, bar tracks, segmented controls — darker than the surface they sit on |
| `surface` | `#1A1D2D` | Cards |
| `surface2` / `surface3` | `#252836` / `#2E3243` | Popovers, pills, row hover / hover on `surface2` |
| `line` / `line-strong` | `rgba(255,255,255,.07 / .12)` | Hairline borders. **Never add an opacity modifier** (`border-line/50`) — Tailwind would replace the alpha, not multiply it |
| `divider` | `#262A3D` | Solid rule (legacy; prefer `line`) |
| `accent` / `accent-2` | `#00D689` / `#00B575` | Primary CTA, brand, selection, focus ring — nothing decorative |
| `ink` / `muted` / `mutedDim` / `faint` | `#FFFFFF` / `#94A3B8` / `#64748B` / `#475066` | Primary / secondary / tertiary / disabled-placeholder text |
| `up` / `down` | `#22C55E` / `#EF4444` | Spend deltas only (less spent / more spent) and destructive actions. Filters are **not** red |

Depth is one strategy: a 1px translucent ring (`shadow-card`, `shadow-popover`), no drop shadows on cards. Motion: name the properties (`transition-[background-color,transform]`, never `transition-all`), `ease-crisp` (`cubic-bezier(0.23,1,0.32,1)`), ≤300 ms, `active:scale-[0.97]` press feedback.

Common classes in [app/globals.css](app/globals.css): `card`, `btn-primary`, `btn-secondary`, `icon-btn` (40px square for arrows/back), `input-field`, `label`, `eyebrow` (uppercase card/section title), `page-header` + `page-header-row`, `pill` + `pill-default` / `pill-active` (a filter is doing something — neutral) / `pill-selected` (chosen option in a form — accent). Utilities: `pt-safe` / `pb-safe` (iOS safe-area insets; the viewport is `viewport-fit=cover`), `pb-nav` (room for BottomNav on mobile), `scrollbar-none`, `animate-pop-in` (popover entrance). Prefer these over inline className stacks.

`colorForString()`'s identity palette deliberately excludes the accent green and the `down` red so a category or person never reads as a status.

### Dashboard architecture

[app/page.tsx](app/page.tsx) is a thin server component: it fetches `thisMonthExpenses` and `prevMonthExpenses` from Sheets, then renders `<Dashboard>`. All aggregation happens client-side inside [components/Dashboard.tsx](components/Dashboard.tsx).

**Layout:** desktop uses a CSS grid `[1fr_400px]` — left column is the full-width Overview hero (the focal point) above a Category | Daily spending pair; right column is a sticky scrollable transaction sidebar. Mobile collapses to a single column; adding is the filled "Add" item in `BottomNav` (no FAB). No tabs. The header uses `relative` + `absolute left-1/2 -translate-x-1/2` to keep `<MonthNav>` dead-centred on all viewports; the desktop right cluster (History link, Settings icon, Add expense) uses `ml-auto` — on lg the BottomNav is hidden, so these links are the desktop navigation.

**Filter/sort state** lives in the URL (not component `useState`) via the `useFilterParams` hook (`lib/useFilterParams.ts`). This means filters survive navigation between Dashboard and `/expenses`, are bookmarkable, and browser back/forward works. URL keys are terse (`t`, `a`, `m`, `p`, `g`, `one`, `sort`, `dir`, `date`, `q` = History search); the excluded-value sets repeat the key per value (`t=Food&t=Rent`) so values may contain commas. Links between pages (MonthNav arrows, Dashboard ↔ History, BottomNav Home/History) build their href with `useCarriedHref()` so the query carries over — a bare `?month=` link would drop the filters. `month` is owned by the server component and preserved untouched. Filter updates use `window.history.replaceState` (not `router.replace`): the server only reads `month`, so filter taps need no server round trip, and Next 15 syncs native history updates into `useSearchParams`. Replace (not push) so the back button still leaves the page.

- Five excluded-value Sets (`excludedTypes`, `excludedApps`, `excludedModes`, `excludedPaidBy`, `excludedTags`) — **inverted logic**: empty = show everything, non-empty = those values are hidden.
- `excludeOneTime` — Dashboard default `true` (hides big one-offs), HistoryView default `false`. `activeFilterCount()` (in `FilterBar.tsx`) only counts it when it differs from the page default, so "Clear" never shows for the default state.
- `showComparison` (toggles `CategoryCard` badge column — proportion % vs delta % vs last month). Owned by Dashboard local `useState`, not URL-backed.
- `sortKey`, `sortDir`, `selectedDate` — URL-backed via `useFilterParams`.

**Two derived filter layers** — analytics cards consume `filtered` (global filter set). The sidebar applies a second pass: `sidebarFiltered = selectedDate ? filtered.filter(e => e.date === selectedDate) : filtered`. Selecting a day scopes only the sidebar list, never the charts.

`handleSelectDay` uses `useMediaQuery('(min-width: 1024px)')` from `lib/useMediaQuery.ts` (not `window.matchMedia` per click). On desktop it calls `setSelectedDate(day)`; on mobile it `router.push`es to `/expenses?month=YYYY-MM&date=YYYY-MM-DD`.

### Card components ([components/cards/](components/cards/))

All cards are wrapped in `React.memo` so toggling a filter only re-renders cards whose data props actually changed. The Dashboard passes pre-computed memoized data via `useMemo`, and handlers via `useCallback`, so referential identity is preserved across renders.

- `OverviewCard` — the hero: month total, delta vs last month, and (current month only) a pace bar: spent → month-end forecast from `forecastMonth()` in [lib/forecast.ts](lib/forecast.ts), with a tick at last month's full total. The forecast is spent so far + everyday spend (expenses < ₹2,500, this month's daily rate blended with the 3-month median) × days left + "bills" (≥ ₹2,500: rent, cook salary, metro passes) that usually land later in the month or are running late. One-time expenses are never projected. `app/page.tsx` passes two extra months (`olderMonthExpenses`) for this; history goes through the same filters. Don't go back to a straight-line `total / day × days-in-month` — rent on the 24th made it ~35% off. For the current month the delta compares against `compareTotal` = last month **up to the same day** (a full month vs 12 days always looks like a saving); for past months, last month's full total. Renders `PaidBySplit` in its right column.
- `PaidBySplit` — stacked proportion bar + a row per person (no Recharts)
- `CategoryCard` — wraps `CategoryBars`; a Share / vs-last-month segmented control switches the badge mode
- `DailyTrendCard` — wraps `DailyTrend`; takes the zero-filled per-day series, `average`, `selectedDate`, and `onSelectDay?: (day: string) => void`

Shared building blocks: `MonthNav` (‹ Month › with 40px targets; Dashboard and History), `FilterBar` (single horizontally-scrolling row of `FilterDropdown`s + one-time toggle + Clear; Dashboard and History), `SortToggle` (Date / Amount / Name segmented control; tapping the active segment flips direction). `FilterDropdown`'s menu is `position: fixed` (so the scrolling row can't clip it), closes on Escape / outside tap / scroll, and returns focus to its trigger.

The transaction list is rendered by the shared `components/TransactionList.tsx` component. Both `Dashboard.tsx` (sidebar) and `HistoryView.tsx` (/expenses page) use it. Props: `expenses`, `showTags?`, `density?: 'compact' | 'comfortable'`, `groupByDay?` — pass `groupByDay={sortKey === 'date'}`: rows are grouped under "Today" / "Yesterday" / "Thu, 8 Oct" headers with that day's total (only meaningful when sorted by date). The component is wrapped in `React.memo` and uses `formatINR` for consistent currency display.

### Charts ([components/charts/](components/charts/))

`CategoryBars` is a pure-CSS horizontal bar list — no Recharts, imported directly. Each row renders a `CategoryGlyph` icon chip, category name, a proportional bar, ₹ value, and a badge. Badge shows proportion % by default; when `showComparison` is true it shows a colored delta % vs last month (more spent = red `down`, less = green `up`). Slices under **4%** of total are bucketed into a gray "Other" row.

`DailyTrend` is a Recharts `BarChart` — one bar per calendar day, zero-filled (an area chart drew a line straight across no-spend days), a dashed reference line at the daily average, and the selected/hovered day at full opacity. When the biggest day is > 2.5× the runner-up (rent on the 1st), the y-axis is capped just above the runner-up and the clipped bar is labelled with its real value. It is loaded via `next/dynamic` with `ssr: false` from inside `DailyTrendCard`. This keeps Recharts (~200–300 KB) off the initial JS bundle. Any new Recharts component should follow the same pattern with a fixed-height skeleton in the `loading` prop to avoid layout shift. All Recharts components use `isAnimationActive={false}` — use CSS transitions instead if animation is needed.

`DailyTrend` wires click to `<BarChart onClick>`, not the tooltip. Do not move it to the tooltip — Recharts moves the tooltip as the cursor approaches it, making it unclickable in practice.

Colors come from `colorForString()` in [components/icons.tsx](components/icons.tsx) — a deterministic hash → 8-color palette. The same function drives `CategoryGlyph` chip backgrounds, `CategoryBars` bars, `AvatarBadge`, and `PaidByCard` bars, so a category/person looks consistent across the whole UI.

`CategoryGlyph` (also in [components/icons.tsx](components/icons.tsx)) maps a category name to a clean SVG icon via case-insensitive keyword matching (e.g. "rent" → home, "health" → cross, "grocery" → cart). Unrecognised names fall back to a generic circle glyph. The internal `glyphFor()` helper is memoized with a `Map<string, string>` so repeated calls for the same category name are O(1).

### Freeform lookup values (Expense Type / App / Payment Mode)

These three fields in `ExpenseForm.tsx` use `<input type="text" list="...">` + `<datalist>` instead of a `<select>`. The browser renders a native autocomplete popup from the existing Settings values; the user can also type anything freeform.

On form submit, `app/actions.ts` calls `promoteLookupValues()` which calls `addSettingValues()` from `lib/settings.ts`. That function does a **single read** of the Settings tab, deduplicates case-insensitively, and issues a **single `batchUpdate`** write — so a new value typed by the user silently appears as a suggestion next time without any manual Settings management.

`PaidBy` and `Tags` intentionally stay curated (one-tap radio chips and chip multi-select respectively) — typos there corrupt expense attribution.

Form order is deliberate: **Amount** (large, autofocused on create) and description first, then Paid by, Type, Date (with Today / Yesterday shortcuts), the optional App / Payment mode pair, the one-time switch (`role="switch"`), and tags. Validation errors render beside the submit button, not at the top of the form.

### Route map

| Route | Page file | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Dashboard — server component, renders `<Dashboard>` |
| `/add` | `app/add/page.tsx` | New expense — renders `<ExpenseForm>` + `<BottomNav>` |
| `/expenses` | `app/expenses/page.tsx` | History — renders `<HistoryView>` + `<BottomNav>` |
| `/expenses/[id]` | `app/expenses/[id]/page.tsx` | Edit expense — renders `<ExpenseForm existing={...}>` + `<BottomNav>` |
| `/settings` | `app/settings/page.tsx` | Settings — renders `<SettingsSection>` cards + `<BottomNav>` |
| `/login` | `app/login/page.tsx` | Login — unprotected, renders Google sign-in button |

`BottomNav` (`components/BottomNav.tsx`) is the mobile-only tab bar (hidden on `lg:`), padded for the iOS home indicator. It is rendered once in the root layout (so it doesn't flicker during navigation) and hides itself on `/login`. Its "Add" item is a filled accent pill — the only "+" on mobile. On desktop, History and Settings are reached from the dashboard header, and both pages have a back chevron (lg only). `SettingsSection` (`components/SettingsSection.tsx`) is optimistic: the list updates on tap, the server action runs in a transition, and the change is rolled back with an inline error if it fails.

Every route has a `loading.tsx` rendering a skeleton from [components/Skeletons.tsx](components/Skeletons.tsx), so a tap shows the next screen immediately. Month ‹ › links use `prefetch` (full prefetch for dynamic routes), so switching months is usually instant.

### Pages & rendering

All pages are `dynamic = 'force-dynamic'`. The in-memory cache (see *Caching, live sync & write invariants*) is what keeps these cheap — `force-dynamic` re-runs the React tree on every request, but the underlying Sheets fetch usually hits the cache.

`ExpenseForm` handles both create (no `existing` prop) and edit (with `existing`) via the same server actions in `app/actions.ts`. **Form submit awaits the action first, then navigates**: `await createExpenseAction(...)` completes before `router.push('/')`, so the dashboard never lands on stale data. The ~300 ms latency is surfaced as a "Saving…" spinner. Errors caught in the `try/catch` render an inline error message in the form — don't restructure this to fire-and-navigate.

### Shared helpers (`lib/`)

| File | Exports | Purpose |
|---|---|---|
| `lib/format.ts` | `formatINR(n, opts?)` | Indian-locale number formatting (no ₹ symbol — callers prepend it). Default: whole rupees. Pass `{ decimals: 2 }` for paise. Use this instead of `.toLocaleString` calls. |
| `lib/utils.ts` | `unique(arr)` | Dedup + sort a `string[]`, filtering out empty strings. |
| `lib/date.ts` | `filterByMonth`, `todayISO`, `yesterdayISO`, `currentMonthStr`, `resolveMonth`, `monthStart` | Month filtering, plus "today" / "this month" in `APP_TIME_ZONE` (Asia/Kolkata). Use these instead of `new Date()` / `format(new Date())`: the server runs in UTC, so a runtime clock gives the wrong month on the 1st before 05:30 IST and hydration mismatches. `resolveMonth` validates `?month=`; `monthStart` parses `YYYY-MM` as a local date (`new Date('YYYY-MM-01')` is UTC). |
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

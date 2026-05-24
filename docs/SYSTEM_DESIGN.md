# How Family Expenses Works — A System Design Walkthrough

**Audience:** Someone comfortable with basic programming concepts (variables, functions, HTTP requests) but new to web app architecture. You don't need to have written a Next.js app or used Google Sheets as a backend before.

This document explains *what* the app is made of, *how* the pieces fit together, and — more importantly — *why* each piece was chosen over the alternatives.

---

## 1. What the app does (in one paragraph)

Family Expenses is a private expense tracker that a small group (a family) signs into with their Google accounts. They add expenses through a phone-friendly web app, see a dashboard of monthly spending, and the data lives in a Google Sheet that the family already owns. No separate database, no app store, no monthly hosting fee.

---

## 2. The whole stack at a glance

```
┌──────────────────────────────────────────────────────┐
│  Phone / Laptop browser (the user)                   │
│  - Shows the dashboard, the form, the charts         │
└─────────────────────┬────────────────────────────────┘
                      │  HTTPS
                      ▼
┌──────────────────────────────────────────────────────┐
│  Vercel  (free hosting, runs Next.js)                │
│  - Serves the HTML/JS                                │
│  - Runs "server actions" (small backend functions)   │
│  - Holds secrets in environment variables            │
└─────────────────────┬────────────────────────────────┘
                      │  Google APIs (HTTPS)
                      ▼
┌──────────────────────────────────────────────────────┐
│  Google                                              │
│  - OAuth (verifies who is signing in)                │
│  - Sheets API (reads/writes the expense rows)        │
└──────────────────────────────────────────────────────┘
```

Three boxes. The browser talks only to Vercel. Vercel is the only thing allowed to talk to Google. The Google Sheet is the database.

---

## 3. Why each piece was chosen

### Why Next.js (instead of plain React, or Django, or Rails)

Next.js is a framework that gives you **both** the frontend (what the user sees) and a small backend (server-side functions) in the same project. For a small app like this, that combo is a huge win:

- **No separate backend server to run.** A traditional setup is "React app on one server, Express/Django API on another." Next.js merges them, so we ship one project.
- **Server Components and Server Actions.** Next.js lets us write functions that *look* like normal TypeScript but actually run on the server. The browser calls them like local functions; Next.js handles the HTTP plumbing invisibly. This is how every "Save expense" / "Delete expense" works in this app — see [app/actions.ts](app/actions.ts).
- **Built-in routing.** A file at `app/expenses/page.tsx` automatically becomes the URL `/expenses`. No router configuration.
- **TypeScript by default.** Catches typos and shape mismatches before the app runs.

Alternatives we passed on:
- *Plain React + Express:* twice the code, two deploy targets.
- *Django/Rails:* great frameworks, but the dashboard is heavily interactive (filters, charts) — that pulls us toward React anyway, at which point Next.js gives the backend "for free."

### Why Vercel (instead of AWS, a VPS, or Heroku)

Vercel is the company that makes Next.js, so they host it best. Concretely:

- **Free tier covers a family-sized app.** A few people logging in a few times a day is nowhere near Vercel's free limits.
- **Push to GitHub → live in ~2 minutes.** No build server to configure. Vercel watches the `main` branch and re-deploys on every push.
- **Serverless functions.** Our server actions don't run on a constantly-running server — Vercel spins up a tiny worker only when someone clicks "Save", then shuts it down. We pay $0 when nobody is using the app.
- **HTTPS, custom domains, environment-variable storage** — all included, no extra setup.

The trade-off: serverless functions have **cold starts** (the first request after a quiet period is slower because Vercel has to wake a worker). For a family app, this is invisible.

### Why Google Sheets as the database (the unusual choice)

This is the most interesting decision in the whole project. Normally you'd reach for Postgres, SQLite, MongoDB, or Firestore. We chose Google Sheets. Why?

**Reasons it works here:**
1. **The data already lived in a Sheet.** The family was already tracking expenses in a shared Google Sheet. The app was added *on top of* that sheet without forcing anyone to migrate.
2. **The Sheet *is* the UI for advanced users.** If someone wants to bulk-edit, sort weirdly, or run a pivot table, they just open the Sheet directly. A real database would have hidden the data behind SQL queries.
3. **Zero hosting cost.** A database server (even a free Postgres on Supabase or Neon) is one more account, one more set of credentials, one more thing that can go down. The Sheet already exists, already has backups (Google's), and already is shared with the family.
4. **Tiny scale.** A few thousand rows of expenses is well within Sheets' comfort zone.

**What we give up by not using a real database:**
- **Speed.** Reading a Sheet over the network is way slower than a real database query (hundreds of milliseconds versus single-digit). We work around this with caching — more on this below.
- **Concurrent writes.** Two people saving an expense at the exact same instant could in theory clobber each other. For a family app, the odds are tiny and not worth solving.
- **Complex queries.** No `JOIN`, no `WHERE … GROUP BY`. We pull all rows for the current month into memory and do filtering/grouping in JavaScript instead.

This decision is the heart of the app's design — almost every other choice flows from it.

### Why TypeScript

Plain JavaScript lets you write `expense.cot` when you meant `expense.cost` and you only find out when the page silently breaks. TypeScript flags it before you save. The cost is a tiny bit of extra ceremony (declaring types like `Expense`); the benefit is the app is far harder to break by accident.

### Why Tailwind CSS

Tailwind lets you style elements with short utility classes (`p-4 rounded-xl bg-surface`) instead of writing separate CSS files. For a one-developer project it means less context-switching: you can see the styles right next to the markup. The downside is the JSX gets visually noisy; we mitigate that by defining reusable named classes (`card`, `btn-primary`, etc.) in [app/globals.css](app/globals.css).

### Why Recharts for the dashboard charts

It's a React-friendly chart library that renders SVG (sharp at any zoom) and supports the chart types we needed (pie, grouped bars, line). It's also a chunky library (~250 KB) — which is why we load it *only* when the dashboard actually needs it, not on every page (see "Code splitting" below).

### Why a PWA instead of a native app

A **Progressive Web App** is a normal website with two extras: a manifest file that describes the app icon/colors, and a service worker that can cache files for offline use. The user can "Add to Home Screen" from Safari or Chrome and it then looks indistinguishable from a native app — full screen, custom icon, no browser chrome.

Why this instead of building a real iOS/Android app?
- **One codebase for both platforms.**
- **No app store reviews, no developer fees.**
- **Updates ship instantly** — push to GitHub, the next time the user opens the icon, they see the new version. No "please update from the App Store."

The only thing we give up is access to native phone features (camera, notifications, etc.) — none of which this app needs.

---

## 4. How a single user action flows through the system

Let's trace **"the user adds a ₹500 grocery expense"** end-to-end.

### Step 1 — The user opens the form

1. User taps the "+" button on the dashboard.
2. The browser navigates to `/add`. That's a Next.js page at [app/add/page.tsx](app/add/page.tsx).
3. Next.js renders the page **on the server** first, then "hydrates" it on the browser so it becomes interactive. (This means the user sees content faster than a pure-browser-rendered app would deliver.)
4. The form ([components/ExpenseForm.tsx](components/ExpenseForm.tsx)) shows fields for date, type, amount, etc. The dropdowns for "Expense Type", "App", and "Payment Mode" are populated from the `Settings` tab of the Sheet, which the server fetched in step 3.

### Step 2 — The user fills the form and taps "Save"

1. The form's `onSubmit` handler calls `createExpenseAction()` — a function imported from [app/actions.ts](app/actions.ts).
2. **This is the magic of server actions.** That function *looks* like a regular function call to the browser code, but Next.js automatically converts it into an HTTPS POST to Vercel. The browser never sees the server-side code; the server-side code never runs in the browser. Credentials stay safely on the server.
3. **Crucially, we navigate first.** The form fires `router.push('/')` *immediately* on Save — the user is sent back to the dashboard before the Sheet write completes. The actual save happens "in the background." This is what makes the app feel instant, even though Google Sheets is slow.

### Step 3 — The server action runs on Vercel

1. Vercel wakes a serverless worker and runs `createExpenseAction()`.
2. First thing the action does: re-check that the user is signed in (via `auth()`). Even though our middleware blocks unauthenticated requests, every action re-checks — defence in depth.
3. It validates the input (the cost is a positive number, the date is a real date, etc.) — see [app/actions.ts](app/actions.ts).
4. It calls `addExpense()` in [lib/expenses.ts](lib/expenses.ts), which builds a row and calls `lib/sheets.ts` to append it to the Sheet.

### Step 4 — Talking to Google Sheets

1. [lib/sheets.ts](lib/sheets.ts) holds a single, cached "Sheets client" — a software object pre-authenticated with our **service account**. (A service account is a non-human Google identity we created in Google Cloud and then shared edit access on the Sheet with. The service account's email looks like `expenses-sheets-writer@…iam.gserviceaccount.com`.)
2. The client sends an HTTPS request to `sheets.googleapis.com` with the new row.
3. Google validates the service account's signed token, finds the Sheet, appends the row, and returns success.
4. The whole round-trip takes 200–500 ms. That sounds fast, but in app terms it's eternity — which is why we navigated the user away in step 2.

### Step 5 — Invalidating the cache

Right after the write, the action calls `invalidateExpensesCache()` and then `revalidatePath('/')`. We'll cover what these do in the next section.

### Step 6 — The dashboard re-renders

1. The user, who was already on the dashboard, sees `router.refresh()` fire (Next.js triggers this when paths are revalidated).
2. Next.js re-runs the dashboard's server-side data fetch, which now returns the new expense, and React seamlessly updates the UI.
3. Total perceived latency for the user: roughly the time it takes them to look up from their phone. The Sheet write happens out of sight.

---

## 5. The single most important performance trick: caching

Google Sheets reads are slow (200–500 ms each). The dashboard needs all expenses for the current and previous month. If we hit Sheets on every page load and every filter click, the app would feel sluggish.

So we cache. There are **two layers** of caching, and they're a common source of confusion, so it's worth understanding the difference:

### Layer A — In-memory data cache (60 seconds)

Inside [lib/expenses.ts](lib/expenses.ts) and [lib/settings.ts](lib/settings.ts), we keep a plain JavaScript variable that stores the last result and the timestamp. If you call `getAllExpenses()` again within 60 seconds, it returns the cached value instantly without touching Google.

This cache lives **inside one serverless worker**. Vercel may have several workers running. They each have their own cache. That's fine — it just means cache hits are more common with a "warm" worker.

When does it become stale? Whenever someone writes data. So every server action that writes calls `invalidateExpensesCache()` immediately after the write. This **must** be done; if we forget, users see stale data for up to 60 seconds.

### Layer B — Next.js render cache

`revalidatePath('/')` tells Next.js: "the rendered HTML for this URL is no longer accurate; the next time someone asks for it, re-render it." This is *separate* from the data cache. We call **both** after a write because they're solving different problems:

- `invalidateExpensesCache()` → "next time you call the Sheets fetcher, actually go to Google."
- `revalidatePath('/')` → "next time you render the homepage, run all the server code again."

If you only call one, you get half-stale state.

---

## 6. Authentication: who's allowed in?

There are three "identities" involved in this app, and people often confuse them:

| Identity | Who it is | What it does |
|---|---|---|
| **Human users** (you, your spouse) | Real Google accounts | Sign in to the app, see expenses |
| **OAuth Client** | A registered "app" in Google Cloud | Lets Google show the "Sign in with Google" screen on our behalf |
| **Service Account** | A robot Google account | Reads and writes the Sheet on the server side |

### Sign-in flow

1. User clicks "Sign in with Google" on `/login`.
2. Browser is redirected to Google. Google shows the consent screen.
3. User picks their account. Google redirects back to `/api/auth/callback/google` with a one-time code.
4. Our server exchanges that code for the user's email address.
5. The `signIn` callback in [lib/auth.ts](lib/auth.ts) checks: is this email in the `ALLOWED_EMAILS` list?
   - **Yes** → a session cookie is set, user is in.
   - **No** → sign-in is rejected, even though they have a real Google account.
6. From here on, every request the browser makes carries that cookie. The middleware ([middleware.ts](middleware.ts)) inspects it and blocks any request without a valid one.

This is the entire access control layer: the allowlist in the environment variable `ALLOWED_EMAILS`. Adding a family member is two changes (the env var and the `PaidBy` column in the Sheet), no code changes.

### Service account: how the server reads/writes

The user is *not* the one talking to the Sheet. The user only signs in for identity. Once we know they're allowed, the server uses its own credential — the service account — to read and write. This is important because:

- The service account's private key never leaves Vercel (it's in an environment variable).
- The user never sees a Google "this app wants to access your Sheets" consent screen for the data — because they aren't the one accessing the data.
- Even if a user is compromised, they can't extract the service account key from the browser.

---

## 7. How the dashboard stays fast despite re-rendering on every filter change

Open the dashboard and toggle a filter — the totals, pie chart, and transaction list all update instantly. Behind the scenes, this is doing a lot of work:

1. The user clicks a checkbox.
2. React updates a state variable (e.g. `excludedTypes` now includes "Food").
3. **The entire `Dashboard` component re-runs.** This is just how React works — state change triggers re-render.

Without precautions, this would re-render every chart and card, even ones whose underlying data didn't change. Three techniques keep it snappy:

### `React.memo` on every card

A "memoized" component skips re-rendering if its props are referentially the same as last time. So if the `PaidByCard` props didn't change, it doesn't re-run its render function or its chart. See [components/cards/](components/cards/).

### `useMemo` and `useCallback` in the parent

For memoization to work, the *parent* must pass the same object/function reference each time. We wrap derived data in `useMemo` and event handlers in `useCallback` so they're only recomputed when the relevant inputs change. See [components/Dashboard.tsx](components/Dashboard.tsx).

### Disabled chart animations

Recharts animates by default. Animating on every filter change is jittery and expensive. We pass `isAnimationActive={false}` to every chart.

The dashboard does all aggregation (totals, by-category sums, daily series) **in the browser** from the raw rows it already has — so toggling a filter never makes a network request.

---

## 8. Code splitting: keeping the initial load small

A modern web app's biggest enemy on a phone is "bundle size" — the amount of JavaScript the browser has to download before anything works. Recharts alone is around 250 KB. If we shipped it with the main bundle, every page load (including the login page) would download charts that the login page doesn't need.

The fix: **`next/dynamic`**. We import the chart components dynamically:

```ts
const CategoryPie = dynamic(() => import('./CategoryPie'), { ssr: false })
```

This tells Next.js: "split this component into its own file, and only download it when something actually renders it." The dashboard fetches `CategoryPie.js` on demand, after the initial HTML is already painted. To the user, charts appear a fraction of a second later than the cards, but the initial paint is much faster.

---

## 9. The Sheet's structure (the "schema")

Even though Sheets isn't a database, it has a schema we agree to as a team — see [CLAUDE.md](CLAUDE.md) for the canonical version.

**`Expenses` tab** — one row per expense:

| Column | Field | Example |
|---|---|---|
| A | Month (auto) | `2026-05` |
| B | Date | `2026-05-24` |
| C | Expense Type | `Grocery` |
| D | App | `Amazon Now` |
| E | Mode of Payment | `UPI` |
| F | Name (description) | `Weekly veggies` |
| G | Cost | `547` |
| H | Paid By | `A` |
| I | 1 time | (blank or `Y`) |
| J | Tags | `vacation, gift` |

Column A is computed automatically by the server when a row is written, so we can filter "this month's expenses" with a fast equality check on column A instead of parsing the date.

**`Settings` tab** — five independent columns (`ExpenseTypes`, `Apps`, `PaymentModes`, `PaidBy`, `Tags`) that act as the source of dropdown options. New values can be appended at the bottom; deleted values just blank out the cell (we don't shift rows, because that would corrupt unrelated lists).

### A subtle invariant about deletes

Each row in our `Expense` type carries a `rowIndex` (the 1-based row number in the Sheet). When the user deletes an expense, we don't *clear* the row — we **`deleteDimension`** it, which physically removes the row and re-numbers everything below. Clearing would leave a blank row, but `deleteDimension` is the right call here because *otherwise blank rows accumulate forever*. The trade-off: we can't trust a stale `rowIndex` after a delete, so the app re-fetches the data afterwards.

---

## 10. Putting it all together: why this stack is right for this app

The recurring theme in every choice above is **"small scale, free, low maintenance":**

- Few users, infrequent writes → Sheets is fine as a database.
- Predictable workload → free Vercel tier is enough.
- Same person ships and uses it → TypeScript + Tailwind keep iteration fast.
- Phone-first usage → PWA gives a native feel without the app-store overhead.
- No ops team → managed Google + managed Vercel = nothing to babysit.

A larger app — say, 10,000 users with concurrent edits — would outgrow Sheets in a week. But for a family, this architecture has one beautiful property: **the marginal cost of running it forever is zero.** And that's the design goal.

---

## Appendix: where to look in the code

| What you want to understand | Read |
|---|---|
| The "endpoint" code (every save/delete) | [app/actions.ts](app/actions.ts) |
| Talking to Google Sheets | [lib/sheets.ts](lib/sheets.ts), [lib/expenses.ts](lib/expenses.ts), [lib/settings.ts](lib/settings.ts) |
| Sign-in / allowlist | [lib/auth.ts](lib/auth.ts), [middleware.ts](middleware.ts) |
| The dashboard (the most React-heavy file) | [components/Dashboard.tsx](components/Dashboard.tsx) |
| The form for adding/editing an expense | [components/ExpenseForm.tsx](components/ExpenseForm.tsx) |
| Design tokens / colors | [tailwind.config.ts](tailwind.config.ts), [app/globals.css](app/globals.css) |
| Setup instructions | [README.md](README.md) |
| Project conventions for future contributors | [CLAUDE.md](CLAUDE.md) |

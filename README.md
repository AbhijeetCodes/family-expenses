# Family Expenses

Private expense tracker PWA for family use. Backed by Google Sheets. Hosted free on Vercel.

📚 **[Interactive course — how this codebase works (non-technical)](https://htmlpreview.github.io/?https://github.com/AbhijeetCodes/family-expenses/blob/main/family-expenses-course.html)**

## Features
- Google Sign-In with email allowlist (private, family-only)
- Add / edit / delete expenses
- All data stays in your existing Google Sheet
- Monthly dashboard: KPI card, category pie, daily trend, paid-by breakdown
- Installable to phone home screen (PWA)

---

## One-time setup

### 1. Install Node.js
Download and install Node.js 20+ from https://nodejs.org/

### 2. Google Cloud — OAuth credentials (for sign-in)

1. Go to https://console.cloud.google.com/ → create a project (e.g. `family-expenses`)
2. **APIs & Services → Enabled APIs** → enable **Google Sheets API**
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorised redirect URIs — add both:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<YOUR-VERCEL-URL>/api/auth/callback/google`  *(add this after Vercel deploy)*
4. Copy the **Client ID** and **Client Secret**

### 3. Google Cloud — Service account (for reading/writing the Sheet)

1. **APIs & Services → Credentials → Create Credentials → Service Account**
   - Give it any name, e.g. `expenses-sheets-writer`
2. Open the service account → **Keys → Add Key → JSON** → download the JSON file
3. Note the `client_email` value (looks like `xxx@xxx.iam.gserviceaccount.com`)

### 4. Share your Google Sheet with the service account

1. Open your existing expenses Google Sheet
2. Click **Share** → paste the service account email → give **Editor** access

### 5. Update the Sheet structure

Add a **`Tags`** column as column I (after `1 time`) in your existing `Expenses` tab header row.

Create a new tab called **`Settings`** with this header row in A1:E1:
```
ExpenseTypes | Apps | PaymentModes | PaidBy | Tags
```
Then fill in the values from your data (one value per row, starting row 2). The app's Settings page can also add/remove values later.

Example Settings tab:
```
ExpenseTypes  Apps         PaymentModes  PaidBy  Tags
Grocery       Amazon Now   UPI           A       vacation
Food          Zomato       Card          N       gift
Household     Instamart    Cash                  tax-deductible
```

### 6. Set up environment variables

**6a. Create the file**

```bash
cp .env.example .env.local
```

Open `.env.local` in any text editor and fill in each value as described below.

---

**`NEXTAUTH_SECRET`** — a random secret used to sign session cookies.

Run this in Terminal and paste the output:
```bash
openssl rand -base64 32
```

---

**`NEXTAUTH_URL`** — set to `http://localhost:3000` for local dev (you'll change this to your Vercel URL later).

---

**`GOOGLE_CLIENT_ID`** and **`GOOGLE_CLIENT_SECRET`** — from the OAuth 2.0 client you created in step 2.

In Google Cloud Console → **APIs & Services → Credentials** → click your OAuth client → copy the Client ID and Client Secret.

---

**`ALLOWED_EMAILS`** — comma-separated Google email addresses of everyone who should have access.

```
ALLOWED_EMAILS=you@gmail.com,spouse@gmail.com
```

---

**`SHEET_ID`** — the long string in the middle of your Google Sheet's URL.

Open your Sheet. The URL looks like:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
```
The Sheet ID is the part between `/d/` and `/edit`:
```
SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

---

**`GOOGLE_SERVICE_ACCOUNT_EMAIL`** — from the JSON key file you downloaded in step 3.

Open the JSON file, find the `client_email` field, and copy its value:
```json
"client_email": "expenses-sheets-writer@your-project.iam.gserviceaccount.com"
```

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=expenses-sheets-writer@your-project.iam.gserviceaccount.com
```

---

**`GOOGLE_SERVICE_ACCOUNT_KEY`** — the private key from the same JSON file. This is the fiddly one.

Open the JSON file and find the `private_key` field. It looks like:
```json
"private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEow...long string...\n-----END RSA PRIVATE KEY-----\n"
```

Copy the entire value **including** the `-----BEGIN` and `-----END` lines. Paste it into `.env.local` wrapped in double quotes:

```
GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEow...long string...\n-----END RSA PRIVATE KEY-----\n"
```

> **Important:** Keep the `\n` characters exactly as they are — do not replace them with real line breaks. The app converts `\n` → newlines automatically.

---

Your completed `.env.local` should look like:

```
NEXTAUTH_SECRET=abc123...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
ALLOWED_EMAILS=you@gmail.com,spouse@gmail.com
SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
GOOGLE_SERVICE_ACCOUNT_EMAIL=expenses-sheets-writer@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
```

### 7. Run locally

```bash
cd family-expenses
npm install
npm run dev
```

Open http://localhost:3000 — sign in with your Google account.

---

## Deploy to Vercel (free)

1. Push this folder to a **private** GitHub repository
2. Go to https://vercel.com → **New Project** → import the repo
3. Add all environment variables from `.env.local` in Vercel's **Settings → Environment Variables**
   - For `NEXTAUTH_URL`, use your Vercel URL: `https://family-expenses-xxx.vercel.app`
4. Deploy — Vercel gives you a free `*.vercel.app` URL
5. Go back to Google Cloud → OAuth client → add the Vercel callback URL to authorised redirects

### Install on phone

On iPhone: open the Vercel URL in Safari → Share → **Add to Home Screen**  
On Android: open in Chrome → menu → **Add to Home Screen**

The app runs like a native app — full screen, no browser UI, your own icon.

---

## Adding a new family member

1. Add their email to `ALLOWED_EMAILS` in Vercel environment variables
2. Add their initials/name to the `PaidBy` column in the `Settings` tab (or via the app's Settings page)
3. Redeploy (Vercel will auto-redeploy when you save env vars and trigger a redeploy)

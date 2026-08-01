# Getting Started — CustodyTrack (Windows)

Follow this in order. Each step tells you exactly what to click or type, and what you
should see if it worked.

---

## Part 1 — Create the Supabase project

1. Go to **https://supabase.com** in your browser. Sign up / log in (GitHub login is
   fastest, use your `berasankhadeep20-lang` account).
2. Click **New Project**.
3. Fill in:
   - **Name:** `custodytrack`
   - **Database Password:** click "Generate a password", then **copy it and save it
     somewhere** (Notepad is fine) — you won't need it often, but you can't recover it later.
   - **Region:** pick `Southeast Asia (Singapore)` or `South Asia (Mumbai)` if shown —
     closest to India, matters for latency, not correctness.
4. Click **Create new project**. It takes 1-2 minutes to provision — you'll see a progress
   screen, just wait.
5. Once it's ready, go to the left sidebar → **Project Settings** (gear icon) → **API**.
   You'll see three values you need — keep this tab open, you'll copy from it repeatedly:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`
   - **service_role** key — another long `eyJ...` string, marked "secret" — **never** put
     this one in frontend code, only in the seed script (Part 3)

---

## Part 2 — Run the 6 migrations

1. In the Supabase dashboard, left sidebar → **SQL Editor**.
2. Click **New query**.
3. Open `backend/migrations/001_reference_tables.sql` from the zip I gave you (in
   Notepad, VS Code, whatever) — select all, copy.
4. Paste into the SQL Editor, click **Run** (or Ctrl+Enter).
   - **Expect:** "Success. No rows returned" at the bottom.
   - **If you see an error:** stop, don't continue to 002 — paste the exact error back to
     me.
5. Click **New query** again (don't reuse the same tab — keeps things clean), repeat for:
   - `002_custody_events.sql`
   - `003_views.sql`
   - `004_rls_policies.sql`
   - `005_rpc_functions.sql`
   - `006_qr_token_flow.sql`
6. **In that exact order** — each one depends on tables/functions the previous one created.

At the end, sidebar → **Table Editor** — you should see tables: `attendants`, `journeys`,
`coaches`, `journey_assignments`, `passengers`, `berths`, `custody_events`, `berth_acks`,
`qr_tokens`. If any are missing, one of the migrations didn't run cleanly — check the SQL
Editor history for errors.

---

## Part 3 — Seed the data

### 3a. Reference data (journey, coach, 10 berths, fake passengers)

1. SQL Editor → **New query**.
2. Paste the contents of `backend/seed/seed_reference_data.sql`, click **Run**.
3. **Expect:** a result table showing 10 rows — berth numbers 1-10 with names like
   "Amit Roy", "Priya Sen", and PNRs like `PNR0000001`. That's the sanity-check query at the
   bottom of the file confirming the insert worked.

### 3b. Demo attendant login (needs Node.js)

**Check if you have Node.js:** open PowerShell, type:
```powershell
node --version
```
If that shows a version number (anything v18+), skip to step 2. If it says "not
recognized," install it first from **https://nodejs.org** (the LTS version, just click
through the installer with defaults), then reopen PowerShell and check again.

1. In PowerShell, navigate to the seed folder (adjust the path to wherever you extracted
   the zip):
   ```powershell
   cd C:\path\to\custodytrack\backend\seed
   ```
2. Install the one dependency this script needs:
   ```powershell
   npm install @supabase/supabase-js
   ```
   Wait for it to finish — you'll see a `node_modules` folder appear.
3. Set the two environment variables (paste your **Project URL** and **service_role key**
   from Part 1, step 5 — the secret one, not anon):
   ```powershell
   $env:SUPABASE_URL="https://abcdefgh.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ...(the long service_role key)"
   ```
4. Run the script:
   ```powershell
   node seed_attendant.mjs
   ```
5. **Expect output:**
   ```
   Created auth user: <some-uuid>
   Done. Log in as attendant.demo@custodytrack.test / ChangeMe123!
   ```
   If you get an error about "duplicate key" or "user already exists," that means you ran
   this before — that's fine, the account already exists, move on.

---

## Part 4 — Verify the backend with curl (before touching the frontend)

Windows PowerShell has `curl` built in (it's actually an alias for `Invoke-WebRequest`, but
these commands work fine as written since we're using flags curl.exe understands — if
something looks odd, run `curl.exe` explicitly instead of `curl`).

**4a. Confirm anonymous access is blocked:**
```powershell
curl.exe "https://abcdefgh.supabase.co/rest/v1/berths?select=*" -H "apikey: <your-anon-key>"
```
**Expect:** `[]` (empty array). If you see actual berth data here, something's wrong with
RLS — stop and flag it to me before continuing, don't proceed to the frontend with broken
RLS.

**4b. Log in as the attendant and confirm they see their real data:**
```powershell
curl.exe -X POST "https://abcdefgh.supabase.co/auth/v1/token?grant_type=password" `
  -H "apikey: <your-anon-key>" -H "Content-Type: application/json" `
  -d '{\"email\":\"attendant.demo@custodytrack.test\",\"password\":\"ChangeMe123!\"}'
```
(Note the backtick line-continuation and escaped quotes — that's PowerShell syntax, not a
typo.)

**Expect:** a JSON blob containing `"access_token": "eyJ..."` — copy that token, then:

```powershell
curl.exe "https://abcdefgh.supabase.co/rest/v1/berths?select=*,passengers(*)" `
  -H "apikey: <your-anon-key>" -H "Authorization: Bearer <access_token-you-just-copied>"
```

**Expect:** all 10 seeded berths, each with a nested `passengers` object showing name and
PNR.

If both 4a and 4b behave as expected, **the entire backend is verified working** —
independent of the frontend, before you've written or run a single line of JS.

---

## Part 5 — Run the frontend

1. In PowerShell:
   ```powershell
   cd C:\path\to\custodytrack\frontend
   npm install
   ```
   This installs everything in `package.json` — takes a minute or two, will print a lot of
   text, that's normal.

2. Copy the example env file and edit it:
   ```powershell
   copy .env.example .env.local
   notepad .env.local
   ```
   Replace the placeholder values with your real **Project URL** and **anon public key**
   from Part 1, step 5 (anon key here, **not** service_role — this file ships to the
   browser). Save and close Notepad.

3. Start the dev server:
   ```powershell
   npm run dev
   ```
   **Expect:** output like `Local: http://localhost:5173/` — open that URL in your browser.

---

## Part 6 — Log in and confirm it actually works

1. You should see the CustodyTrack login screen (dark theme, matches the status site).
2. Log in: `attendant.demo@custodytrack.test` / `ChangeMe123!`
3. **Expect:** "Coach S4 — Sleeper", "Train 12345", and all 10 berths listed with real
   passenger names/PNRs, every item showing a grey **"not issued"** badge with an **Issue**
   button next to it.
4. Click **Issue** on Berth 1's Blanket — badge should flip to **issued** (amber) within
   about a second, no page reload.
5. Click **Acknowledge** on Berth 1 — pick OTP, note the code shown, type it back in,
   confirm — badge should show **acked via otp**.
6. Click **Return** on that Blanket — badge flips to **returned** (green), button
   disappears.

If all of that works, **Phases 0-2 are fully verified**, end to end, on a real database.

---

## If something breaks

Tell me exactly which step number, and paste:
- The exact command you ran
- The exact error text (not a paraphrase — copy/paste it)

That's almost always enough for me to spot the issue immediately rather than guessing.

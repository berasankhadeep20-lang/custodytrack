# Phase 0 — Infrastructure Setup

I can't create the Supabase project for you (needs your account), but here's the exact path.

## 1. Create the project
1. Go to https://supabase.com → New Project → name it `custodytrack`, pick a region close
   to you (Mumbai/Singapore), set a database password (save it somewhere).
2. Once it's provisioned: **Project Settings → API** — copy the **Project URL** and the
   **anon public key** (frontend will use these later) and the **service_role key**
   (seed script only — never in frontend code).

## 2. Run the migrations
Easiest path: **SQL Editor** tab in the Supabase dashboard, paste and run each file in
`backend/migrations/` **in order** (001 through 006) — each one depends on the previous.

(If you prefer the CLI: `npm install -g supabase`, `supabase link --project-ref <ref>`,
then `supabase db push` after placing these files under a `supabase/migrations/` folder
with the naming convention it expects — the dashboard route is simpler for now.)

## 3. Seed the data
```bash
# In the SQL Editor, run:
backend/seed/seed_reference_data.sql

# Then, from a terminal with Node installed:
cd backend/seed
npm install @supabase/supabase-js
$env:SUPABASE_URL="https://xxxx.supabase.co"                 # PowerShell syntax
$env:SUPABASE_SERVICE_ROLE_KEY="xxxx"
node seed_attendant.mjs
```

## 4. Verify (this is the actual Phase 0 exit criterion)

**4a — RLS actually blocks anonymous reads:**
```bash
curl "https://xxxx.supabase.co/rest/v1/berths?select=*" \
  -H "apikey: <anon-key>"
# Expect: empty array or permission error — NOT the seeded berths.
# If you see berth data here, an RLS policy is missing or wrong. Stop and fix before continuing.
```

**4b — An authenticated attendant sees their real data:**
```bash
# Get a session token by logging in as the demo attendant:
curl -X POST "https://xxxx.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <anon-key>" -H "Content-Type: application/json" \
  -d '{"email":"attendant.demo@custodytrack.test","password":"ChangeMe123!"}'
# Copy the access_token from the response, then:

curl "https://xxxx.supabase.co/rest/v1/berths?select=*,passengers(*)" \
  -H "apikey: <anon-key>" -H "Authorization: Bearer <access_token>"
# Expect: all 10 seeded berths with joined passenger names/PNRs.
```

If both checks pass, Phase 0 is done — the schema, RLS, and RPC functions from every prior
design doc are proven to work against a real database, before a single line of frontend
code exists. That's the whole point of doing it in this order.

## Next
Phase 1: the attendant login screen and a read-only `BerthList`/`BerthCard` rendering exactly
what step 4b just proved works — say the word when you're ready and we'll scaffold the
Vite/React app for real this time.

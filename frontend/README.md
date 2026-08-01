# CustodyTrack — Frontend

Scope now includes Phase 2: attendant login, berth chart, and the full
issue → acknowledge (OTP) → return flow, live against Supabase. QR acknowledgment
and offline support are not in yet — those are Phase 3/4.

## Run it locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your Supabase Project URL + anon key
# (Project Settings -> API, after completing backend/PHASE0_SETUP.md)
npm run dev
```

Log in with the demo attendant created by `backend/seed/seed_attendant.mjs`
(`attendant.demo@custodytrack.test` / `ChangeMe123!`).

## What to actually test (Phase 2 exit criterion)

1. Click **Issue** on a berth's Blanket — badge should flip to "issued" without a
   page reload.
2. Click **Acknowledge** — choose OTP, note the simulated code shown, type it back
   in, confirm. Badge should show "acked via otp".
3. Click **Return** on that same item — badge flips to "returned", and the button
   disappears (returned is terminal in this MVP — no un-return action).
4. Open the same berth in a second browser tab/window and click Acknowledge again —
   it should come back as already-acknowledged rather than creating a second
   `berth_acks` row. This is the duplicate-handling behavior from `docs/API.md` §3,
   now visible through real UI instead of just the SQL.
5. In the Supabase dashboard, check the `custody_events` table directly — you
   should see one row per issue/return click, never overwritten, exactly as
   described in `docs/SCHEMA.md`'s event-sourcing rationale.

## Known limitation carried over from this phase

There's no optimistic UI or offline queue yet — every click waits on a live network
round-trip, and the whole card list refetches after each action rather than
updating just the one item. Both are intentional simplifications for Phase 2; the
outbox in Phase 3 replaces the refetch-everything approach with local-first writes.


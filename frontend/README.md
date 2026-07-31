# CustodyTrack — Frontend (Phase 1)

Scope right now: attendant login + **read-only** berth chart. No issue/ack/return
actions yet — that's Phase 2, per `docs/ROADMAP.md`.

## Run it locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your Supabase Project URL + anon key
# (Project Settings -> API, after completing backend/PHASE0_SETUP.md)
npm run dev
```

Log in with the demo attendant created by `backend/seed/seed_attendant.mjs`
(`attendant.demo@custodytrack.test` / `ChangeMe123!`) — you should see the 10 seeded
berths for coach S4, each showing "not issued" for all 5 items (correct — no events
exist yet, since writes aren't wired up until Phase 2).

## What to check this actually proves

If this loads correctly, it confirms — through real UI, not just curl — that:
- Supabase Auth login works
- RLS scopes the attendant to exactly their assigned coach (try logging in and
  confirm you see coach S4's 10 berths, not some other coach's data)
- The `item_current_status` view join works even when empty (no false statuses shown)

That's the Phase 1 exit criterion from `docs/ROADMAP.md`.

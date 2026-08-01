# CustodyTrack — Frontend

Phases 1-3 implemented: login, live berth chart, the full issue/ack/return flow,
and now **offline support** — everything above keeps working with no network at
all, and syncs automatically once connectivity returns. QR acknowledgment is
still Phase 4.

## Run it locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your Supabase Project URL + anon key
npm run dev
```

Log in with the demo attendant (`attendant.demo@custodytrack.test` / `ChangeMe123!`).

## What to actually test — Phase 3 exit criterion

This is the scenario the whole offline design exists for. Test it exactly like this:

1. Load the app normally, confirm you see the berth chart and a "Synced" indicator
   near the top.
2. Open DevTools (F12) → **Network** tab → set throttling to **Offline**
   (or literally disconnect your wifi).
3. Click **Issue** on a few items across a few berths. **Expect:** badges update
   instantly — no spinner, no delay, no error. The connectivity indicator should
   switch to **"Offline — N changes queued."**
4. While still offline, refresh the page. **Expect:** the berth chart still loads
   (from the IndexedDB cache), and your queued changes are still reflected — check
   your browser's DevTools → **Application** tab → **IndexedDB** → `custodytrack` →
   `outbox` to see the queued rows directly.
5. Turn the network back on (undo the throttling / reconnect wifi).
   **Expect:** within ~10 seconds, the indicator switches to "Syncing…" then back
   to "Synced," and the queued count drops to 0 — with no action from you.
6. In the Supabase Table Editor, check `custody_events` — you should see exactly
   one row per action, no duplicates, even though some of those writes happened
   while you were disconnected.

## The one thing worth understanding, not just testing

Every queued write carries a `client_event_id` generated **once, when you click
the button** — not regenerated if the request has to retry after a dropped
connection. That's what makes step 6 come out clean: if a write's response never
arrived (because you went offline right as it was sent), the retry uses the
identical ID, so the server either applies it once or recognizes the retry as a
duplicate — never both. See `docs/API.md` §3-4 and `src/sync/syncEngine.js`'s
comments for the full reasoning.

## Known simplifications at this phase

- The initial "which coach am I assigned to" lookup still needs one successful
  network request (typically right after login, when you have a connection) —
  only the berth chart itself is cached for fully offline use after that.
- Periodic reconciliation polls every 3 seconds rather than using Realtime
  subscriptions — simpler to reason about for this phase; Realtime is a natural
  upgrade for Phase 4's admin dashboard, not needed here.



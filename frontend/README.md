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

## Phase 4 — QR path + admin dashboard

Run the seed script again first (it's idempotent now — safe to rerun):
```bash
cd ../backend/seed
node seed_attendant.mjs
```
This creates a second demo login: `tte.demo@custodytrack.test` / `ChangeMe123!`,
for testing `/admin`.

### Testing QR acknowledgment

The realistic version of this needs two devices — your computer (attendant) and
a phone (passenger) on the same wifi network. For that:
```bash
npm run dev -- --host
```
This prints a `Network:` URL (something like `http://192.168.x.x:5173/`) — open
**that** on your phone instead of `localhost`. Log in as the attendant on your
computer as usual, click **Acknowledge → QR** on a berth, and scan the code with
your phone's camera.

**Simpler alternative for local testing (no second device needed):** click
**Acknowledge → QR**, then right-click the QR image → copy the image and decode
it with any QR reader app, or just open a **private/incognito browser window**
and manually navigate to whatever the modal's underlying confirm URL would be
(you can find it by inspecting the `<img>` element's context, or temporarily
adding a `console.log(confirmUrl)` in `QrDisplay.jsx`). Either way, opening that
`/confirm/:token` URL in a *separate, logged-out* browser context is what
actually proves the passenger-side flow works without an attendant session
riding along.

**Expect:** the confirm page shows "Thanks — your linen items are now
acknowledged." Back on the attendant's berth chart (give it a few seconds for
the periodic refresh), that berth's ack badge should update automatically —
you don't need to click anything.

**Test the duplicate/expired paths too:**
- Open the *same* confirm URL a second time → should show "already been
  confirmed," not an error.
- Generate a new QR, wait 5+ minutes, then try to use it → should show
  "This code has expired."

### Testing the admin dashboard

Sign out, log back in as `tte.demo@custodytrack.test` / `ChangeMe123!`, or just
click **Admin view →** from the attendant screen (works either way — RLS is
what actually scopes the data, not which account you're on; see
`docs/SCHEMA.md` §4). You should see a bar chart and a table of unresolved
items. If you've been issuing items without returning them during earlier
testing, those should show up here now.



- The initial "which coach am I assigned to" lookup still needs one successful
  network request (typically right after login, when you have a connection) —
  only the berth chart itself is cached for fully offline use after that.
- Periodic reconciliation polls every 3 seconds rather than using Realtime
  subscriptions — simpler to reason about for this phase; Realtime is a natural
  upgrade for Phase 4's admin dashboard, not needed here.



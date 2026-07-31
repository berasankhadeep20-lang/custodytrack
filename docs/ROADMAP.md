# Implementation Roadmap — CustodyTrack

Version 0.1

The guiding rule: **every phase ends with something you can actually run and show**, even if
it's incomplete. We don't build all the pieces separately and wire them together at the end —
that's exactly the kind of integration risk this staged approach is meant to avoid.

---

## Phase 0 — Infrastructure (no UI yet)

**Goal:** the database exists, is queryable, and holds realistic-looking data.

- Create Supabase project, run migrations `001`–`006` from `MODULES.md`
- Run `seed_synthetic_data.sql` — one journey, one coach, ~10 berths, fake passengers
- Verify via `curl` or the Supabase dashboard that `GET /rest/v1/berths?select=*,passengers(*)`
  returns sensible joined data, and that RLS actually blocks an unauthenticated request

**Demo at end of phase:** a `curl` command returning real seeded data. Not exciting to look
at, but it proves the schema and RLS from `SCHEMA.md` actually work before any frontend code
depends on them — cheapest possible point to catch a schema mistake.

## Phase 1 — Read-only attendant view

**Goal:** an attendant can log in and see their real berth chart. No writes yet.

- `api/supabaseClient.js`, `api/custodyApi.js` (read functions only)
- `features/attendant/BerthList.jsx`, `BerthCard.jsx` (display only, no toggles wired up)
- Basic Supabase Auth login screen

**Demo:** attendant logs in, sees the 10 seeded berths with passenger names and (empty) item
status. Proves auth + RLS + PostgREST reads work end-to-end through real UI.

## Phase 2 — Online-only write flow (the actual point of the project, minus offline)

**Goal:** the full issue → ack → return → reconcile flow works, assuming a network connection.

- Wire up `issueItem()`, `returnItem()`, `ackBerthOtp()` in `custodyApi.js` — called directly,
  no outbox yet
- `AckModal.jsx` + `OtpEntry.jsx` (QR path can come slightly later — OTP is simpler to get
  working first since it doesn't need the public token route)
- `item_current_status` reads reflected live in `BerthCard.jsx`

**Demo:** issue a full kit to a berth, acknowledge via OTP, mark 4 of 5 items returned, see the
UI reflect it correctly. This is the smallest slice that proves the *actual value proposition*
of the project — everything before this phase was plumbing, everything after is robustness.

## Phase 3 — Offline outbox + sync engine

**Goal:** Phase 2's flow keeps working with the network off.

- `db/schema.js`, `db/outboxRepo.js`, `db/cacheRepo.js`
- `sync/connectivity.js`, `sync/syncEngine.js` implementing the taxonomy from `API.md`
- Retrofit Phase 2's write calls to go through the outbox instead of calling `custodyApi`
  directly

**Demo:** toggle airplane mode mid-flow, issue/ack/return items, confirm the UI updates
instantly with zero network. Reconnect, confirm everything syncs with no duplicate rows in
Postgres — this is the scenario the Playwright test in `MODULES.md` targets directly, and the
one worth recording a screen capture of for a portfolio writeup.

## Phase 4 — QR path + reconciliation + admin dashboard

**Goal:** the second ack path works, and unresolved items are visible where they should be.

- `006_qr_token_flow.sql` implementation, `QrDisplay.jsx`, public `QrConfirmPage.jsx` route
- `features/admin/ReconciliationDashboard.jsx` (reads `unresolved_items`)
- `LossAnalyticsChart.jsx` (Recharts, loss rate by route)

**Demo:** simulate a full journey — issue, ack via QR this time, deliberately leave one item
unreturned, "arrive" at destination, show the admin dashboard correctly flagging that item
against the passenger's PNR, not the attendant.

## Phase 5 — Demo dataset, polish, writeup

**Goal:** something a recruiter or reviewer can look at cold and understand in two minutes.

- Expand seed data to several trains/routes/dates so the analytics chart has something
  meaningful to show
- Full test pass (Vitest + pgTAP + Playwright suites from `MODULES.md`)
- Update `site/index.html` and `README.md` to reflect MVP-complete status
- Record a short demo (the offline-to-sync moment from Phase 3 is the most compelling clip)

---

## GitHub Project board

Rather than hand-build this in the browser, here's a script using `gh` CLI to create one
issue per deliverable above, labeled by phase — run it once from the repo root:

```bash
# One-time: create the labels
for p in phase-0 phase-1 phase-2 phase-3 phase-4 phase-5; do
  gh label create "$p" --color "0366d6" 2>/dev/null
done

# Phase 0
gh issue create -t "Set up Supabase project + run migrations 001-006" -l phase-0
gh issue create -t "Seed synthetic journey/coach/berth/passenger data" -l phase-0
gh issue create -t "Verify RLS blocks unauthenticated reads (curl test)" -l phase-0

# Phase 1
gh issue create -t "Attendant login screen (Supabase Auth)" -l phase-1
gh issue create -t "BerthList + BerthCard: read-only render of seeded chart" -l phase-1

# Phase 2
gh issue create -t "custodyApi.js: issueItem, returnItem, ackBerthOtp" -l phase-2
gh issue create -t "AckModal + OtpEntry, wired to live Supabase calls" -l phase-2
gh issue create -t "Item status reflects live in BerthCard" -l phase-2

# Phase 3
gh issue create -t "Dexie schema + outboxRepo + cacheRepo" -l phase-3
gh issue create -t "syncEngine: implement the ok/duplicate/auth/validation/network taxonomy" -l phase-3
gh issue create -t "Retrofit Phase 2 writes to go through the outbox" -l phase-3
gh issue create -t "Playwright test: offline flow -> reconnect -> no duplicate rows" -l phase-3

# Phase 4
gh issue create -t "006_qr_token_flow.sql + ack_berth_via_qr RPC" -l phase-4
gh issue create -t "QrDisplay + public QrConfirmPage route" -l phase-4
gh issue create -t "ReconciliationDashboard (unresolved_items)" -l phase-4
gh issue create -t "LossAnalyticsChart (Recharts, loss rate by route)" -l phase-4

# Phase 5
gh issue create -t "Expand seed dataset across multiple trains/routes" -l phase-5
gh issue create -t "Full Vitest + pgTAP + Playwright pass" -l phase-5
gh issue create -t "Update site/ and README to MVP-complete status" -l phase-5
gh issue create -t "Record demo clip of offline-to-sync flow" -l phase-5
```

Then create the board itself and add everything to it:

```bash
gh project create --owner berasankhadeep20-lang --title "CustodyTrack MVP"
# Note the project number it prints, then:
gh project item-add <project-number> --owner berasankhadeep20-lang --url <issue-url>
# (gh issue list --json url -q '.[].url' will give you all the URLs to loop over)
```

Board columns worth setting up manually in the UI (Project → Settings → View): **Backlog →
In Progress → Demoed → Done** — the "Demoed" column matters here specifically, since the
whole point of this roadmap is that each phase produces something shown working, not just
something merged.

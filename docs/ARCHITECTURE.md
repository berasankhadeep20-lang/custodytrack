# System Architecture — CustodyTrack

Version 0.1

---

## 1. High-level shape

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Attendant App (PWA)     │        │  Supabase (hosted)            │
│  React + Vite + Tailwind │        │  ├─ Postgres (custody_events) │
│                          │  sync  │  ├─ PostgREST (auto REST API) │
│  IndexedDB:              │◄──────►│  ├─ Auth (attendant/TTE login)│
│   - local berth cache    │        │  └─ Realtime (live updates)   │
│   - outbox (queued acts) │        └──────────────────────────────┘
└─────────────────────────┘                     ▲
                                                  │ realtime subscription
                                    ┌──────────────────────────────┐
                                    │  Admin/TTE Dashboard (React)  │
                                    │  loss analytics, reconcile    │
                                    └──────────────────────────────┘
```

**Why this split:** the attendant app is the only piece that *must* work offline (a moving coach loses signal constantly). The admin dashboard doesn't need offline support — it's used from a station office or by a TTE with a device that isn't the one recording events, so it can be a normal always-online client subscribing to live data.

## 2. Why Supabase for the backend (NFR-6: low infra cost)

We're not writing a custom Express/Django server. Supabase gives us:
- **Postgres** — a real relational database, not a toy, free tier is generous
- **PostgREST** — auto-generates a REST API from the schema, so there's no hand-written CRUD backend to maintain
- **Auth** — attendant/TTE/admin login out of the box, with row-level security (RLS) controlling who can see what
- **Realtime** — the admin dashboard can subscribe to `custody_events` changes and update live, without polling

This matters for a solo student project: it removes an entire category of infrastructure (server hosting, deployment, uptime) that would otherwise eat most of the build time without teaching anything new. The frontend still does real engineering work — the offline-sync logic below is the actual hard problem, and Supabase doesn't solve that for us.

*(If this were a real Railways deployment, it would run on IR's own infrastructure, not a third-party BaaS — worth stating explicitly in any writeup, since a recruiter should see you understand the difference between "portfolio-appropriate" and "production-appropriate" choices.)*

## 3. Data model philosophy: event sourcing, not status mutation

Instead of a `custody` table with a `status` column that gets overwritten (`issued` → `returned`), we record every action as an **immutable event**:

```
custody_events: (event_id, berth_id, item_type, action, actor, timestamp, ack_method, client_event_id)
```

Current state for any item is *derived* by replaying its events (last event wins for state; but no event is ever deleted or edited). This is what satisfies **NFR-5 (auditability)** from the SRS — if a dispute ever arises about who returned what and when, the full history is there, not just a final snapshot. It's the same principle as a bank ledger vs. a bank balance: the balance is a derived value, the transactions are the source of truth.

## 4. The actual hard problem: offline-first sync

This is the part worth understanding conceptually before we touch code.

### 4.1 The scenario
Attendant is mid-coach, no signal. They issue a berth's linen kit and tap "QR acknowledge." The passenger scans it — this needs to work with **zero network**, because that's the common case, not the edge case.

### 4.2 The mechanism: local-first writes + outbox queue
Every action (issue, ack, return) is written **immediately** to IndexedDB on the device — the UI updates instantly regardless of connectivity. That same write is also pushed into an **outbox**: a local queue of "events that haven't reached the server yet."

A background sync process (triggered by `navigator.onLine` events and periodic retries) drains the outbox in order whenever connectivity exists, POSTing each queued event to Supabase and marking it synced on success.

### 4.3 The concrete conflict: what if OTP and QR both fire for the same berth?
The SRS says OTP and QR are used *interchangeably* — normally the attendant picks one. But offline, a real failure mode exists: attendant taps QR, it appears to queue locally, they assume it failed (no visible confirmation while offline) and fall back to OTP. Now **two ack events for the same berth** are sitting in the outbox.

**The fix is an idempotency key, not a locking mechanism.** Every ack event carries a deterministic `client_event_id` derived from `berth_id + "ack"` (not a random UUID). The database has a **unique constraint** on `client_event_id`. When the outbox syncs:
- First ack event to reach the server: inserted normally.
- Second ack event for the same berth (regardless of OTP or QR): the unique constraint rejects the duplicate insert; the server returns "already acknowledged" instead of an error; the client treats this as success and discards the duplicate from its outbox.

This is the standard pattern for offline-tolerant systems — **make retries and duplicates safe by construction**, rather than trying to prevent them from happening (which is impossible when you don't control when connectivity returns). It's the same idea behind idempotency keys in payment APIs: you can't stop a client from double-submitting, so you make double-submission harmless instead.

### 4.4 Why this doesn't need a fancier CRDT/merge system
We don't need general-purpose conflict-free replicated data types here because there's no scenario where two *different* pieces of information about the same fact need to be merged — only "did this ack happen, yes or no," which collapses to a simple first-writer-wins uniqueness check. Recognizing that the problem is simpler than it first looks is itself part of the design — reaching for CRDTs here would be solving a harder problem than the one we have.

## 5. Roles & access (RLS-backed)

| Role | Can do |
|---|---|
| Attendant | Issue/ack/return items only for berths in their assigned coach/journey |
| TTE | Read-only view of reconciliation status for coaches on their train |
| Admin | Read aggregate analytics across all trains; cannot see individual passenger PNR without drill-down justification logged |

Enforced via Supabase RLS policies keyed off the authenticated user's role claim — not application-layer checks, so it holds even if the frontend has a bug.

## 6. Frontend structure (React + Vite + Tailwind, per standard stack)

```
frontend/
├── src/
│   ├── db/            # IndexedDB wrapper (Dexie.js) — local cache + outbox
│   ├── sync/           # Outbox drain logic, connectivity listeners
│   ├── api/            # Supabase client + typed queries
│   ├── features/
│   │   ├── attendant/   # Issue/ack/return screens
│   │   └── admin/       # Reconciliation + analytics dashboard
│   └── components/      # Shared UI
```

## 7. What's next
**Database schema** — the exact Postgres tables (`custody_events`, `passengers`/synthetic PNR data, `journeys`, `berths`), constraints, and indexes that this architecture depends on.

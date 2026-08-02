# CustodyTrack — Project Writeup

## The problem

Indian Railways coach attendants have blanket/pillow costs deducted from their
salary when passengers don't return linen — despite having no practical way to
prevent it. CustodyTrack fixes the actual injustice: it ties every issued item
to the passenger's PNR via an OTP or QR acknowledgment, so anything missing at
journey's end is flagged against the *passenger's* record, not the attendant's.

## What it is

A PWA for train attendants (React + Vite + Tailwind) backed by Postgres
(Supabase), offline-first by design — coach connectivity is patchy, so the app
has to keep working with zero network and sync automatically once it returns.

**Live status/demo page:** https://berasankhadeep20-lang.github.io/custodytrack/
**Source:** https://github.com/berasankhadeep20-lang/custodytrack

## Engineering decisions worth highlighting

- **Event sourcing over mutable state.** Every issue/return/ack is an
  immutable row, not a `status` column that gets overwritten. Current state is
  a *view*, derived from the log — so history and current-state can never
  disagree, because there's only one source of truth.

- **Idempotency keys solve two problems with one mechanism.** The same
  `client_event_id`-based uniqueness constraint that resolves the OTP-vs-QR
  race condition (two acknowledgment paths for one berth) also makes network
  retries after a dropped connection safe — recognizing these were the same
  underlying problem, not two separate ones, is what kept the design simple.

- **Offline-first via a local outbox + optimistic overlay.** Actions write to
  IndexedDB immediately (instant UI feedback, even fully offline), then sync
  in the background. A derived-state overlay merges pending local actions onto
  the last-confirmed server state, so the UI is always showing the right thing
  whether or not the network round-trip has completed yet.

## Real bugs found and fixed during live testing

This is the part worth talking about in an interview — every one of these was
found by actually running the system against a live database, not by code
review, and each has a specific, explainable root cause:

1. **RLS self-referential recursion.** A helper function used inside a table's
   own RLS policy queried that same table internally — without `SECURITY
   DEFINER`, the inner query got subject to the same policy it was helping
   evaluate, silently resolving to "no rows visible" instead of an error.
   Fixed by making the helper functions `SECURITY DEFINER`.

2. **A table with RLS enabled but zero policies.** Supabase enables RLS by
   default on new tables in some project configurations — `journey_assignments`
   had RLS on with no policy at all, meaning default-deny blocked even the
   correct attendant from seeing their own assignment. Found via direct
   `pg_class`/`information_schema` inspection rather than guessing.

3. **`INSERT ... RETURNING` needs a SELECT policy, not just an INSERT policy.**
   The subtlest one: every component of the INSERT policy's `WITH CHECK`
   tested true individually via isolated SQL queries, yet the real function
   call still failed with the identical error message. Root cause: Postgres
   checks `RETURNING` output against a SELECT policy, and none existed —
   which happens to raise the *same* "new row violates row-level security
   policy" error as an INSERT failure, making it genuinely hard to
   distinguish without knowing to check for a missing SELECT policy
   specifically.

4. **An outbox item permanently stuck at `status: 'sending'`.** No recovery
   path existed for an item if the browser refreshed or an unexpected error
   hit mid-sync-attempt — the item became invisible to the drain loop forever,
   since it only ever queries `status: 'pending'`. Fixed with a startup
   recovery step (`resetOrphanedSending()`) plus a defensive catch around the
   whole per-item processing loop, so no future unhandled error can leave
   state inconsistent the same way.

## Test coverage

- **Vitest** — unit tests for the outbox state machine and the optimistic-UI
  overlay logic, including a regression test for bug #4 above.
- **pgTAP** — proves the conflict-handling guarantee at the database level:
  retrying a write, or racing OTP against QR for the same berth, never
  produces a duplicate row.
- See `docs/MODULES.md` §3 for the full test-to-module mapping, including what
  Playwright coverage would look like for the end-to-end offline scenario.

## Build process

Built in six phases (SRS → architecture → schema → API → module breakdown →
roadmap → implementation), each phase verified live before moving to the next
rather than writing the whole thing and debugging it all at once at the end.
Full documentation trail in `docs/` — SRS, architecture doc, schema with
rationale, API design, module breakdown, and the phased roadmap.

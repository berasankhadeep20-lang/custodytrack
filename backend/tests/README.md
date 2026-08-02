# Backend Tests

## test_conflict_handling.sql (pgTAP)

**1. Enable the extension** (one-time): Supabase dashboard → **Database** →
**Extensions** → search "pgtap" → enable it.

**2. Run it**: paste the whole contents of `test_conflict_handling.sql` into the
SQL Editor and run it.

**Expect:** output like
```
ok 1 - first issue_item call returns ok
ok 2 - retried issue_item with same client_event_id returns duplicate
ok 3 - exactly one custody_events row exists despite two issue_item calls
ok 4 - first ack_berth (OTP) call returns ok
ok 5 - second ack_berth (QR) for the same berth returns duplicate, not a new ack
ok 6 - exactly one berth_acks row exists despite OTP+QR both attempting to ack the same berth
```
6 lines, all `ok`. If any say `not ok`, that's a real regression in the
conflict-handling logic — not something to explain away.

The whole test runs inside a transaction that's rolled back at the end, so it's
safe to run against your live project as many times as you want — it never
actually leaves any test rows behind, even though it uses your real seeded
attendant and berth data to make the RLS checks behave exactly like a real
request would.

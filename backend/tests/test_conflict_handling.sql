-- test_conflict_handling.sql
-- Proves the core correctness claim from docs/API.md §3: retrying the same
-- write, or racing OTP against QR for the same berth, never produces a
-- second row — it produces a clean 'duplicate' response instead.
--
-- Requires the pgtap extension (Database -> Extensions -> enable "pgtap" in
-- the Supabase dashboard). Run the whole file in the SQL Editor.
--
-- Everything here runs inside one transaction, uses the real seeded demo
-- attendant/berth, and is ROLLED BACK at the very end — so it's safe to run
-- against your actual project without leaving any test data behind.

begin;
select plan(6);

select id as attendant_id into temp t_attendant from attendants where employee_id = 'DEMO-001';
select berth_id into temp t_berth from berths
  where coach_id = '22222222-2222-2222-2222-222222222222' and berth_no = '1';

-- Simulate being logged in as that attendant, the way PostgREST sets up the
-- request context from a real JWT — this is what makes auth.uid() and the
-- RLS policies behave exactly as they would for a real API call, not a
-- superuser bypass.
set local role authenticated;
select set_config('request.jwt.claim.sub', (select attendant_id::text from t_attendant), true);

-- 1. First issue succeeds.
select is(
  (select (issue_item((select berth_id from t_berth), 'blanket', 1, 'test-issue-1', now()))->>'status'),
  'ok',
  'first issue_item call returns ok'
);

-- 2. Retrying with the SAME client_event_id (simulating a network retry after
-- a dropped response) returns duplicate, not an error and not a new row.
select is(
  (select (issue_item((select berth_id from t_berth), 'blanket', 1, 'test-issue-1', now()))->>'status'),
  'duplicate',
  'retried issue_item with same client_event_id returns duplicate'
);

-- 3. Prove it at the data level too — not just the response shape.
select is(
  (select count(*)::int from custody_events where client_event_id = 'test-issue-1'),
  1,
  'exactly one custody_events row exists despite two issue_item calls'
);

-- 4. First ack (simulating the OTP path) succeeds.
select is(
  (select (ack_berth((select berth_id from t_berth), 'otp', 'test-ack-otp', now()))->>'status'),
  'ok',
  'first ack_berth (OTP) call returns ok'
);

-- 5. A SECOND ack for the SAME berth, with a DIFFERENT client_event_id
-- (simulating QR racing OTP for the same berth — the actual scenario
-- docs/ARCHITECTURE.md §4.3 was designed around) returns duplicate.
select is(
  (select (ack_berth((select berth_id from t_berth), 'qr', 'test-ack-qr', now()))->>'status'),
  'duplicate',
  'second ack_berth (QR) for the same berth returns duplicate, not a new ack'
);

-- 6. And again, prove it at the data level: exactly one ack row, no matter
-- which method "won."
select is(
  (select count(*)::int from berth_acks where berth_id = (select berth_id from t_berth)),
  1,
  'exactly one berth_acks row exists despite OTP+QR both attempting to ack the same berth'
);

select * from finish();
rollback; -- undoes every insert above — nothing from this test persists

-- seed_demo_dataset.sql
-- Run this AFTER seed_reference_data.sql and seed_attendant.mjs.
-- Adds 2 more journeys/coaches/berths (different trains/routes), assigns the
-- existing demo attendant to all of them, and deliberately leaves a handful of
-- items issued-but-unreturned — simulating what actually happens on a real
-- route, so the admin dashboard has more than one train's worth of data to
-- chart and the reconciliation table isn't empty.

do $$
declare
  v_attendant_id uuid;
  v_journey2_id uuid := '33333333-3333-3333-3333-333333333333';
  v_journey3_id uuid := '44444444-4444-4444-4444-444444444444';
  v_coach2_id uuid := '55555555-5555-5555-5555-555555555555';
  v_coach3_id uuid := '66666666-6666-6666-6666-666666666666';
  v_passenger_id uuid;
  v_berth_id uuid;
  i int;
  v_names text[] := array['Arjun Nair','Meera Pillai','Karthik Iyer','Lakshmi Menon','Ravi Krishnan',
                           'Deepa Warrier','Sanjay Kurup','Anitha Namboothiri','Vinod Panicker','Geetha Unni'];
begin
  select id into v_attendant_id from attendants where employee_id = 'DEMO-001';
  if v_attendant_id is null then
    raise exception 'Run seed_attendant.mjs before this script — no DEMO-001 attendant found.';
  end if;

  -- Journey 2: Chennai -> Bangalore, AC coach
  insert into journeys (journey_id, train_no, journey_date, source_station, destination_station)
  values (v_journey2_id, '54321', current_date, 'Chennai Central', 'Bangalore City')
  on conflict do nothing;

  insert into coaches (coach_id, journey_id, coach_number, coach_class)
  values (v_coach2_id, v_journey2_id, 'A1', '3AC')
  on conflict do nothing;

  insert into journey_assignments (coach_id, attendant_id)
  values (v_coach2_id, v_attendant_id)
  on conflict do nothing;

  for i in 1..10 loop
    insert into passengers (pnr, name, mobile, boarding_station, destination_station)
    values ('PNR2' || lpad(i::text, 6, '0'), v_names[i], '9' || lpad((200000000 + i)::text, 9, '0'),
            'Chennai Central', 'Bangalore City')
    returning passenger_id into v_passenger_id;

    insert into berths (coach_id, berth_no, passenger_id)
    values (v_coach2_id, i::text, v_passenger_id)
    returning berth_id into v_berth_id;

    -- Simulate realistic loss: berths 3 and 7 have an unreturned blanket.
    if i in (3, 7) then
      insert into custody_events (berth_id, item_type, item_seq, action, actor_id, client_event_id, event_time)
      values (v_berth_id, 'blanket', 1, 'issued', v_attendant_id, gen_random_uuid()::text, now() - interval '2 hours');
    end if;
  end loop;

  -- Journey 3: Delhi -> Mumbai, Sleeper coach
  insert into journeys (journey_id, train_no, journey_date, source_station, destination_station)
  values (v_journey3_id, '67890', current_date, 'New Delhi', 'Mumbai Central')
  on conflict do nothing;

  insert into coaches (coach_id, journey_id, coach_number, coach_class)
  values (v_coach3_id, v_journey3_id, 'B2', 'Sleeper')
  on conflict do nothing;

  insert into journey_assignments (coach_id, attendant_id)
  values (v_coach3_id, v_attendant_id)
  on conflict do nothing;

  for i in 1..10 loop
    insert into passengers (pnr, name, mobile, boarding_station, destination_station)
    values ('PNR3' || lpad(i::text, 6, '0'), v_names[11 - i], '9' || lpad((300000000 + i)::text, 9, '0'),
            'New Delhi', 'Mumbai Central')
    returning passenger_id into v_passenger_id;

    insert into berths (coach_id, berth_no, passenger_id)
    values (v_coach3_id, i::text, v_passenger_id)
    returning berth_id into v_berth_id;

    -- Berths 2, 5, and 9 have unreturned items — a slightly worse loss rate
    -- than journey 2, so the by-route chart shows a real difference, not
    -- identical bars.
    if i in (2, 5, 9) then
      insert into custody_events (berth_id, item_type, item_seq, action, actor_id, client_event_id, event_time)
      values (v_berth_id, 'pillow', 1, 'issued', v_attendant_id, gen_random_uuid()::text, now() - interval '5 hours');
    end if;
  end loop;
end $$;

-- Sanity check: should show 2 unreturned items for train 54321, 3 for train 67890.
select train_no, count(*) as unresolved_count
from unresolved_items
group by train_no
order by train_no;

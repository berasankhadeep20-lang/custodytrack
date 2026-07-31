-- seed_reference_data.sql
-- One journey, one coach, 10 berths with fake passengers. Enough to demo the
-- full flow without needing real IRCTC data. Run this AFTER migrations 001-006,
-- and BEFORE seed_attendant.mjs (which needs the journey/coach IDs printed below).

insert into journeys (journey_id, train_no, journey_date, source_station, destination_station)
values ('11111111-1111-1111-1111-111111111111', '12345', current_date, 'Howrah', 'New Delhi')
on conflict do nothing;

insert into coaches (coach_id, journey_id, coach_number, coach_class)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'S4', 'Sleeper')
on conflict do nothing;

-- 10 synthetic passengers + berths
do $$
declare
  i int;
  v_passenger_id uuid;
  v_names text[] := array['Amit Roy','Priya Sen','Rahul Das','Sneha Ghosh','Vikram Nair',
                           'Anjali Iyer','Suresh Menon','Kavita Rao','Manoj Pillai','Divya Krishnan'];
begin
  for i in 1..10 loop
    insert into passengers (pnr, name, mobile, boarding_station, destination_station)
    values (
      'PNR' || lpad(i::text, 7, '0'),
      v_names[i],
      '9' || lpad((100000000 + i)::text, 9, '0'),
      'Howrah',
      'New Delhi'
    )
    returning passenger_id into v_passenger_id;

    insert into berths (coach_id, berth_no, passenger_id)
    values ('22222222-2222-2222-2222-222222222222', i::text, v_passenger_id);
  end loop;
end $$;

-- Sanity check output
select b.berth_no, p.name, p.pnr from berths b join passengers p on b.passenger_id = p.passenger_id
where b.coach_id = '22222222-2222-2222-2222-222222222222' order by b.berth_no::int;

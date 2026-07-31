-- 003_views.sql
-- Current state is always derived from the event log, never stored separately.
-- See docs/SCHEMA.md §3.

create view item_current_status as
select distinct on (berth_id, item_type, item_seq)
  berth_id, item_type, item_seq, action as current_status, event_time
from custody_events
order by berth_id, item_type, item_seq, event_time desc;

create view unresolved_items as
select
  b.berth_id, p.pnr, p.name, j.train_no, j.journey_date,
  c.coach_number, b.berth_no, ics.item_type, ics.item_seq, ics.event_time as issued_at
from item_current_status ics
join berths b on b.berth_id = ics.berth_id
join passengers p on p.passenger_id = b.passenger_id
join coaches c on c.coach_id = b.coach_id
join journeys j on j.journey_id = c.journey_id
where ics.current_status = 'issued';

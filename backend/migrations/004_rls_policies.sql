-- 004_rls_policies.sql
-- Enforced at the database, not just the app — see docs/SCHEMA.md §4.

-- Helper: is the current user a TTE or admin?
-- SECURITY DEFINER + search_path pin is required here (not just a style choice):
-- is_assigned_to_berth() below queries the berths table, and that function is
-- called FROM WITHIN berths' own RLS policy. Without SECURITY DEFINER, that inner
-- query would be subject to the same RLS policy it's helping evaluate — a
-- self-reference that resolves to "not visible" for every row, not an error,
-- which makes it a quiet bug rather than a loud one. Running as definer bypasses
-- RLS for this specific, narrowly-scoped lookup.
create or replace function is_tte_or_admin() returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from attendants where id = auth.uid() and role in ('tte', 'admin')
  );
$$;

-- Helper: is the current user assigned to the coach a given berth belongs to?
create or replace function is_assigned_to_berth(p_berth_id uuid) returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from journey_assignments ja
    join berths b on b.coach_id = ja.coach_id
    where b.berth_id = p_berth_id and ja.attendant_id = auth.uid()
  );
$$;

alter table berths enable row level security;
alter table passengers enable row level security;
alter table coaches enable row level security;
alter table journeys enable row level security;
alter table custody_events enable row level security;
alter table berth_acks enable row level security;
alter table journey_assignments enable row level security;

-- Attendants can see their own assignment row (needed for fetchAssignedCoach());
-- TTE/admin can see all assignments.
create policy read_own_assignments on journey_assignments for select
  using (is_tte_or_admin() or attendant_id = auth.uid());

-- Reads: TTE/admin see everything; attendants see only their assigned coaches
create policy read_berths on berths for select
  using (is_tte_or_admin() or is_assigned_to_berth(berth_id));

create policy read_passengers on passengers for select
  using (is_tte_or_admin() or exists (
    select 1 from berths b where b.passenger_id = passengers.passenger_id
    and is_assigned_to_berth(b.berth_id)
  ));

create policy read_coaches on coaches for select
  using (is_tte_or_admin() or exists (
    select 1 from journey_assignments ja where ja.coach_id = coaches.coach_id
    and ja.attendant_id = auth.uid()
  ));

create policy read_journeys on journeys for select
  using (is_tte_or_admin() or exists (
    select 1 from coaches c join journey_assignments ja on ja.coach_id = c.coach_id
    where c.journey_id = journeys.journey_id and ja.attendant_id = auth.uid()
  ));

create policy read_custody_events on custody_events for select
  using (is_tte_or_admin() or is_assigned_to_berth(berth_id));

create policy read_berth_acks on berth_acks for select
  using (is_tte_or_admin() or is_assigned_to_berth(berth_id));

-- Writes: only an assigned attendant can insert events for their own berths.
-- (Writes go through the RPC functions in 005, but RLS applies underneath them too —
-- defense in depth, not either/or.)
create policy attendant_insert_custody_events on custody_events for insert
  with check (is_assigned_to_berth(berth_id));

create policy attendant_insert_berth_acks on berth_acks for insert
  with check (is_assigned_to_berth(berth_id));

# Database Schema — CustodyTrack

Version 0.1 — Postgres (via Supabase)

This schema implements the event-sourced model from `ARCHITECTURE.md`: item-level custody
state is *derived* from an append-only event log, never stored as a mutable column.

---

## 1. Reference / setup tables

```sql
-- Attendants, TTEs, and admins — one row per person, linked to Supabase Auth
create table attendants (
  id            uuid primary key references auth.users(id),
  employee_id   text unique not null,
  name          text not null,
  role          text not null check (role in ('attendant', 'tte', 'admin')),
  created_at    timestamptz not null default now()
);

-- One row per train journey (a specific train, on a specific date)
create table journeys (
  journey_id          uuid primary key default gen_random_uuid(),
  train_no            text not null,
  journey_date         date not null,
  source_station       text not null,
  destination_station  text not null,
  created_at          timestamptz not null default now(),
  unique (train_no, journey_date)
);

-- One row per coach within a journey
create table coaches (
  coach_id      uuid primary key default gen_random_uuid(),
  journey_id    uuid not null references journeys(journey_id) on delete cascade,
  coach_number  text not null,        -- e.g. "S4"
  coach_class   text not null,        -- e.g. "Sleeper", "3AC"
  unique (journey_id, coach_number)
);

-- Which attendant is responsible for which coach on which journey
create table journey_assignments (
  assignment_id  uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references coaches(coach_id) on delete cascade,
  attendant_id   uuid not null references attendants(id),
  unique (coach_id, attendant_id)
);

-- Synthetic PNR / reservation-chart data (stand-in for real IRCTC/PRS data)
create table passengers (
  passenger_id          uuid primary key default gen_random_uuid(),
  pnr                    text not null unique,
  name                   text not null,      -- synthetic
  mobile                 text not null,      -- synthetic, used for simulated OTP
  boarding_station       text not null,
  destination_station    text not null
);

-- One row per berth per journey, linking a passenger to a physical seat
create table berths (
  berth_id      uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references coaches(coach_id) on delete cascade,
  berth_no      text not null,           -- e.g. "34"
  passenger_id  uuid not null references passengers(passenger_id),
  unique (coach_id, berth_no)
);
```

**Why `journeys` → `coaches` → `berths` as a hierarchy, not one flat table:** it mirrors the
real structure (a berth only means something in the context of a coach, a coach only in the
context of a journey), and it's what lets the analytics dashboard aggregate cleanly by train,
route, or date without joining through synthetic identifiers.

## 2. The event log (the core of the system)

```sql
-- Item-level events: issued / returned. One row per action, never updated or deleted.
create table custody_events (
  event_id        uuid primary key default gen_random_uuid(),
  berth_id        uuid not null references berths(berth_id),
  item_type       text not null check (item_type in ('blanket', 'pillow', 'bedsheet', 'towel')),
  item_seq        smallint not null default 1 check (item_seq in (1, 2)),  -- bedsheet has 2; others always 1
  action          text not null check (action in ('issued', 'returned')),
  actor_id        uuid not null references attendants(id),
  client_event_id text not null unique,   -- idempotency key, generated on-device
  event_time      timestamptz not null,   -- when it actually happened, per the device clock
  synced_at       timestamptz not null default now(),  -- when the server received it
  constraint valid_item_seq check (item_seq = 1 or item_type = 'bedsheet')
);

create index idx_custody_events_berth on custody_events(berth_id, item_type, item_seq, event_time);

-- Berth-level acknowledgment: exactly one per berth, ever — this IS the conflict resolution
-- mechanism described in the architecture doc (first ack wins, by construction).
create table berth_acks (
  berth_id        uuid primary key references berths(berth_id),  -- PK enforces "at most one ack per berth"
  ack_method      text not null check (ack_method in ('otp', 'qr')),
  actor_id        uuid not null references attendants(id),
  client_event_id text not null unique,
  event_time      timestamptz not null,
  synced_at       timestamptz not null default now()
);
```

**Why `berth_acks` is a separate table from `custody_events`, not another `action` value:**
acknowledgment is a fundamentally different kind of fact — it happens once per berth (covers
the whole 5-item kit), not once per item. Modeling it separately lets the primary key itself
(`berth_id`) enforce the "one ack per berth" business rule at the database level. If the second
ack attempt (say, OTP after QR already synced) arrives, the `insert` simply violates the
primary key — the API layer catches that specific error and returns "already acknowledged"
instead of propagating it as a failure. No application-level locking or coordination needed.

**Why `client_event_id` on both tables even though `berth_acks` already has a natural unique
key:** `custody_events` doesn't have an equivalent natural key (a berth can have many issued/
returned events over time), so it needs its own idempotency key to make network retries safe.
Kept on both tables for consistency in the API layer.

## 3. Derived state (views, not stored columns)

```sql
-- Current status of every item, derived from its most recent event
create view item_current_status as
select distinct on (berth_id, item_type, item_seq)
  berth_id, item_type, item_seq, action as current_status, event_time
from custody_events
order by berth_id, item_type, item_seq, event_time desc;

-- Reconciliation: every item that's still 'issued' (not returned) for berths
-- whose passenger has reached their destination
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
```

**Why views instead of a `status` column updated on write:** this is the direct payoff of
event sourcing — `item_current_status` is always consistent with the event log by
construction, because it's *computed* from the log, not maintained separately alongside it.
There's no possibility of the "current status" and "history" disagreeing, because there's only
one source of truth.

## 4. Row-Level Security (sketch — enforced at the database, not just the app)

```sql
alter table custody_events enable row level security;

-- Attendants can only insert events for berths in coaches they're assigned to
create policy attendant_insert_own_coach on custody_events
  for insert
  with check (
    exists (
      select 1 from journey_assignments ja
      join berths b on b.coach_id = ja.coach_id
      where b.berth_id = custody_events.berth_id
      and ja.attendant_id = auth.uid()
    )
  );

-- TTEs and admins can read everything; attendants can read only their assigned coaches
create policy read_access on custody_events
  for select
  using (
    exists (select 1 from attendants where id = auth.uid() and role in ('tte', 'admin'))
    or exists (
      select 1 from journey_assignments ja
      join berths b on b.coach_id = ja.coach_id
      where b.berth_id = custody_events.berth_id and ja.attendant_id = auth.uid()
    )
  );
```

## 5. What's next
**API design** — the exact endpoints (or Supabase RPC functions) the frontend calls, including
how the outbox drain logic maps queued local events to these tables, and how the client
distinguishes "synced successfully" from "rejected as duplicate" from "genuinely failed."

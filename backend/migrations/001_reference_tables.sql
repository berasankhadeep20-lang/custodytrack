-- 001_reference_tables.sql
-- Attendants, journeys, coaches, assignments, synthetic passengers, berths.
-- See docs/SCHEMA.md §1 for the design rationale behind this hierarchy.

create extension if not exists pgcrypto;  -- for gen_random_uuid()

create table attendants (
  id            uuid primary key references auth.users(id),
  employee_id   text unique not null,
  name          text not null,
  role          text not null check (role in ('attendant', 'tte', 'admin')),
  created_at    timestamptz not null default now()
);

create table journeys (
  journey_id          uuid primary key default gen_random_uuid(),
  train_no            text not null,
  journey_date         date not null,
  source_station       text not null,
  destination_station  text not null,
  created_at          timestamptz not null default now(),
  unique (train_no, journey_date)
);

create table coaches (
  coach_id      uuid primary key default gen_random_uuid(),
  journey_id    uuid not null references journeys(journey_id) on delete cascade,
  coach_number  text not null,
  coach_class   text not null,
  unique (journey_id, coach_number)
);

create table journey_assignments (
  assignment_id  uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references coaches(coach_id) on delete cascade,
  attendant_id   uuid not null references attendants(id),
  unique (coach_id, attendant_id)
);

create table passengers (
  passenger_id          uuid primary key default gen_random_uuid(),
  pnr                    text not null unique,
  name                   text not null,
  mobile                 text not null,
  boarding_station       text not null,
  destination_station    text not null
);

create table berths (
  berth_id      uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references coaches(coach_id) on delete cascade,
  berth_no      text not null,
  passenger_id  uuid not null references passengers(passenger_id),
  unique (coach_id, berth_no)
);

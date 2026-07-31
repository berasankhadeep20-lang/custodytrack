-- 002_custody_events.sql
-- The event-sourced core: custody_events (item-level) + berth_acks (berth-level).
-- See docs/SCHEMA.md §2 for why these are two separate tables, not one.

create table custody_events (
  event_id        uuid primary key default gen_random_uuid(),
  berth_id        uuid not null references berths(berth_id),
  item_type       text not null check (item_type in ('blanket', 'pillow', 'bedsheet', 'towel')),
  item_seq        smallint not null default 1 check (item_seq in (1, 2)),
  action          text not null check (action in ('issued', 'returned')),
  actor_id        uuid not null references attendants(id),
  client_event_id text not null unique,
  event_time      timestamptz not null,
  synced_at       timestamptz not null default now(),
  constraint valid_item_seq check (item_seq = 1 or item_type = 'bedsheet')
);

create index idx_custody_events_berth on custody_events(berth_id, item_type, item_seq, event_time);

create table berth_acks (
  berth_id        uuid primary key references berths(berth_id),
  ack_method      text not null check (ack_method in ('otp', 'qr')),
  actor_id        uuid not null references attendants(id),
  client_event_id text not null unique,
  event_time      timestamptz not null,
  synced_at       timestamptz not null default now()
);

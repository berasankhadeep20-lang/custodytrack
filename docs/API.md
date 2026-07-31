# API Design — CustodyTrack

Version 0.1

The API is Supabase's auto-generated PostgREST layer for reads, plus three hand-written
Postgres RPC functions for writes. Writes are RPC, not raw table inserts, for one reason:
we need custom conflict handling (turn a duplicate-key error into a clean "already happened"
response) and PostgREST's default insert behavior can't express that.

---

## 1. Reads (PostgREST, auto-generated — no code to write)

| Purpose | Call |
|---|---|
| Load a coach's berth chart for the attendant app | `GET /rest/v1/berths?coach_id=eq.<id>&select=*,passengers(*),item_current_status(*)` |
| Reconciliation view for TTE/admin | `GET /rest/v1/unresolved_items?train_no=eq.<x>&journey_date=eq.<y>` |
| Loss analytics by route (admin dashboard) | `GET /rest/v1/unresolved_items?select=train_no,count()&group_by=train_no` (or a dedicated aggregate view if this gets used often — see §4) |

PostgREST's `select` embedding handles the joins; RLS (from `SCHEMA.md`) restricts what rows
come back per role automatically, so there's no separate authorization logic to write here.

## 2. Writes: three RPC functions

### 2.1 `issue_item`

```sql
create or replace function issue_item(
  p_berth_id uuid, p_item_type text, p_item_seq smallint,
  p_actor_id uuid, p_client_event_id text, p_event_time timestamptz
) returns jsonb
language plpgsql
as $$
declare
  v_event_id uuid;
begin
  insert into custody_events (berth_id, item_type, item_seq, action, actor_id, client_event_id, event_time)
  values (p_berth_id, p_item_type, p_item_seq, 'issued', p_actor_id, p_client_event_id, p_event_time)
  on conflict (client_event_id) do nothing
  returning event_id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('status', 'duplicate');
  end if;
  return jsonb_build_object('status', 'ok', 'event_id', v_event_id);
end;
$$;
```

`return_item` is identical with `action = 'returned'`.

### 2.2 `ack_berth`

```sql
create or replace function ack_berth(
  p_berth_id uuid, p_ack_method text, p_actor_id uuid,
  p_client_event_id text, p_event_time timestamptz
) returns jsonb
language plpgsql
as $$
begin
  insert into berth_acks (berth_id, ack_method, actor_id, client_event_id, event_time)
  values (p_berth_id, p_ack_method, p_actor_id, p_client_event_id, p_event_time);

  return jsonb_build_object('status', 'ok');
exception
  when unique_violation then
    -- Either this exact event was retried, or the *other* ack method already
    -- claimed this berth first. Both cases are "not an error" from the caller's
    -- perspective — the berth is acknowledged, which is what mattered.
    return jsonb_build_object(
      'status', 'duplicate',
      'existing_ack', (select ack_method from berth_acks where berth_id = p_berth_id)
    );
end;
$$;
```

All three are called as `POST /rest/v1/rpc/issue_item` etc., with the parameters as a JSON body.

## 3. Why `status: 'duplicate'` is a 200, not an error

This is the detail the whole offline-sync design hinges on. There are two situations that
produce a duplicate at the database level, and **the client cannot always tell them apart —
and doesn't need to:**

1. The exact same event was queued and sent twice (e.g. the app crashed after a successful
   sync but before marking the outbox item as sent, so it resends on next launch).
2. A genuinely different event collided with the business rule (OTP ack sent after a QR ack
   for the same berth already succeeded).

In both cases, the correct client behavior is identical: **treat it as success and drop the
item from the outbox.** The berth *is* acknowledged, or the item *is* issued — that fact is
true regardless of which of the two situations produced the duplicate response. Making the
client distinguish them would add complexity for no behavioral difference.

## 4. The sync outcome taxonomy (what the outbox drain logic actually branches on)

| Response | Meaning | Outbox action |
|---|---|---|
| `200 {status: 'ok'}` | Event recorded | Remove from outbox |
| `200 {status: 'duplicate'}` | Already recorded (by this event or a conflicting one) | Remove from outbox — **not a failure** |
| `401 / 403` | Session expired or attendant not assigned to this coach | Pause queue, prompt re-login; do not drop the event |
| `4xx` (validation) | Malformed payload — shouldn't happen if the client is correct, but if it does, retrying won't help | Drop from outbox, log locally for manual review, surface a non-blocking warning to the attendant |
| No response / timeout / network error | Unknown whether the server received it | **Keep in outbox**, retry with exponential backoff — safe to retry because of the idempotency key |

The last row is why the idempotency key matters beyond just the OTP/QR case: it's *also* what
makes "retry on timeout" safe, since a timeout doesn't tell you whether the write actually
landed. Without `client_event_id`, retrying a timed-out request could double-issue an item;
with it, the retry either succeeds cleanly or comes back `duplicate` — either way, correct.

## 5. What's next
**Module breakdown** — translating this into the actual frontend code structure: the
`db/`, `sync/`, `api/`, and `features/` folders sketched in the architecture doc, with the
specific responsibilities of each file, before writing any implementation code.

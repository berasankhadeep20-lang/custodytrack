-- 005_rpc_functions.sql
-- See docs/API.md for why these are RPC functions rather than raw table inserts:
-- we need to catch the unique-violation conflict and return a clean 'duplicate'
-- status instead of letting PostgREST surface a raw 409.

create or replace function issue_item(
  p_berth_id uuid, p_item_type text, p_item_seq smallint,
  p_client_event_id text, p_event_time timestamptz
) returns jsonb
language plpgsql
security invoker  -- runs as the calling attendant; RLS from 004 still applies
as $$
declare
  v_event_id uuid;
begin
  insert into custody_events (berth_id, item_type, item_seq, action, actor_id, client_event_id, event_time)
  values (p_berth_id, p_item_type, p_item_seq, 'issued', auth.uid(), p_client_event_id, p_event_time)
  on conflict (client_event_id) do nothing
  returning event_id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('status', 'duplicate');
  end if;
  return jsonb_build_object('status', 'ok', 'event_id', v_event_id);
end;
$$;

create or replace function return_item(
  p_berth_id uuid, p_item_type text, p_item_seq smallint,
  p_client_event_id text, p_event_time timestamptz
) returns jsonb
language plpgsql
security invoker
as $$
declare
  v_event_id uuid;
begin
  insert into custody_events (berth_id, item_type, item_seq, action, actor_id, client_event_id, event_time)
  values (p_berth_id, p_item_type, p_item_seq, 'returned', auth.uid(), p_client_event_id, p_event_time)
  on conflict (client_event_id) do nothing
  returning event_id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('status', 'duplicate');
  end if;
  return jsonb_build_object('status', 'ok', 'event_id', v_event_id);
end;
$$;

create or replace function ack_berth(
  p_berth_id uuid, p_ack_method text,
  p_client_event_id text, p_event_time timestamptz
) returns jsonb
language plpgsql
security invoker
as $$
begin
  insert into berth_acks (berth_id, ack_method, actor_id, client_event_id, event_time)
  values (p_berth_id, p_ack_method, auth.uid(), p_client_event_id, p_event_time);

  return jsonb_build_object('status', 'ok');
exception
  when unique_violation then
    return jsonb_build_object(
      'status', 'duplicate',
      'existing_ack', (select ack_method from berth_acks where berth_id = p_berth_id)
    );
end;
$$;

grant execute on function issue_item(uuid, text, smallint, text, timestamptz) to authenticated;
grant execute on function return_item(uuid, text, smallint, text, timestamptz) to authenticated;
grant execute on function ack_berth(uuid, text, text, timestamptz) to authenticated;

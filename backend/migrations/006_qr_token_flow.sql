-- 006_qr_token_flow.sql
-- Resolves the gap surfaced in docs/MODULES.md §0: OTP is entered by an already-
-- authenticated attendant, but QR is scanned by the passenger, who has no login at
-- all. The QR code encodes a short-lived single-use token instead of the berth_id
-- directly; the passenger's confirmation page calls a SECURITY DEFINER function
-- that validates the token and performs the ack on their behalf.

create table qr_tokens (
  token       uuid primary key default gen_random_uuid(),
  berth_id    uuid not null references berths(berth_id),
  actor_id    uuid not null references attendants(id),  -- the attendant who generated it
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used        boolean not null default false
);

alter table qr_tokens enable row level security;

-- Only an assigned attendant can generate a token for a berth (normal RLS, not SECURITY DEFINER —
-- the attendant already has legitimate write access here).
create policy attendant_insert_qr_tokens on qr_tokens for insert
  with check (is_assigned_to_berth(berth_id) and actor_id = auth.uid());

-- Needed for a non-obvious reason: generate_qr_token() does an
-- INSERT ... RETURNING to hand the new token back to the caller. Under RLS,
-- Postgres checks the returned row against a SELECT policy, not just the
-- INSERT policy's WITH CHECK — with no SELECT policy at all, that lookup is
-- denied, and the error it raises is indistinguishable from an INSERT
-- failure ("new row violates row-level security policy"), which made this
-- one genuinely confusing to track down.
create policy attendant_read_own_qr_tokens on qr_tokens for select
  using (actor_id = auth.uid());

create or replace function generate_qr_token(p_berth_id uuid) returns uuid
language plpgsql
security invoker
as $$
declare
  v_token uuid;
begin
  insert into qr_tokens (berth_id, actor_id, expires_at)
  values (p_berth_id, auth.uid(), now() + interval '5 minutes')
  returning token into v_token;
  return v_token;
end;
$$;

grant execute on function generate_qr_token(uuid) to authenticated;

-- The passenger-facing function. SECURITY DEFINER because the passenger is on the
-- 'anon' role with no table access at all — this function is their only door in,
-- and it's scoped to exactly one action: consume one valid, unused, unexpired token.
create or replace function ack_berth_via_qr(p_token uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_berth_id uuid;
  v_actor_id uuid;
  v_expires_at timestamptz;
  v_used boolean;
  v_ack_result jsonb;
begin
  select berth_id, actor_id, expires_at, used
  into v_berth_id, v_actor_id, v_expires_at, v_used
  from qr_tokens where token = p_token
  for update;

  if v_berth_id is null then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  if v_used then
    -- Token already consumed. The berth is acknowledged either way (that's what
    -- consuming it means) — treat as duplicate, not an error, per the same
    -- reasoning as the OTP path in ack_berth.
    return jsonb_build_object('status', 'duplicate');
  end if;

  if now() > v_expires_at then
    return jsonb_build_object('status', 'expired');
  end if;

  update qr_tokens set used = true where token = p_token;

  insert into berth_acks (berth_id, ack_method, actor_id, client_event_id, event_time)
  values (v_berth_id, 'qr', v_actor_id, 'qr-token-' || p_token::text, now())
  on conflict (berth_id) do nothing;

  if not found then
    -- Berth was already acknowledged via the other path (OTP) before this token was used.
    return jsonb_build_object('status', 'duplicate');
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

grant execute on function ack_berth_via_qr(uuid) to anon;
grant execute on function ack_berth_via_qr(uuid) to authenticated;

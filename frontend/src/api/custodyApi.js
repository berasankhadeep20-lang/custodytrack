import { supabase } from './supabaseClient'

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  await supabase.auth.signOut()
}

export function getSession() {
  return supabase.auth.getSession()
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session))
}

/**
 * Loads a coach's berth chart with joined passenger info and current item status.
 * RLS (migration 004) ensures this only returns berths the logged-in attendant
 * is actually assigned to — no client-side filtering needed or trusted.
 *
 * item_current_status and berth_acks are VIEWS/tables PostgREST can't auto-embed
 * the way it does `passengers` (that one works because berths.passenger_id is a
 * real foreign key; views have no FK for PostgREST to detect). So this fetches
 * them separately and merges client-side instead of relying on embedding to work.
 */
export async function fetchBerthChart(coachId) {
  const { data: berths, error: berthsError } = await supabase
    .from('berths')
    .select('berth_id, berth_no, passengers ( name, pnr )')
    .eq('coach_id', coachId)
    .order('berth_no')
  if (berthsError) throw berthsError

  const berthIds = berths.map((b) => b.berth_id)
  if (berthIds.length === 0) return []

  const [{ data: statuses, error: statusError }, { data: acks, error: ackError }] = await Promise.all([
    supabase.from('item_current_status').select('*').in('berth_id', berthIds),
    supabase.from('berth_acks').select('berth_id, ack_method').in('berth_id', berthIds),
  ])
  if (statusError) throw statusError
  if (ackError) throw ackError

  return berths.map((berth) => ({
    ...berth,
    items: statuses.filter((s) => s.berth_id === berth.berth_id),
    ack: acks.find((a) => a.berth_id === berth.berth_id) ?? null,
  }))
}

/**
 * Finds the coach(es) the current attendant is assigned to. Phase 1 assumes one
 * coach per attendant for simplicity (matches the seed data) — supporting multiple
 * assigned coaches is a straightforward extension, not a redesign, when needed.
 */
export async function fetchAssignedCoach() {
  const { data, error } = await supabase
    .from('journey_assignments')
    .select('coach_id, coaches ( coach_number, coach_class, journeys ( train_no, journey_date ) )')
    .limit(1)
    .single()

  if (error) throw error
  return data
}

// --- Writes. All three call the RPC functions from migration 005, which handle
// the ok/duplicate distinction server-side (see docs/API.md).
//
// client_event_id and event_time are passed in by the caller (the outbox — see
// db/outboxRepo.js) rather than generated here. This matters: the idempotency
// guarantee only works if the SAME client_event_id is reused across every retry
// of the same logical action. Generating a fresh one per network attempt would
// silently break the exact mechanism docs/API.md §4 depends on.

export async function issueItem(berthId, itemType, itemSeq, clientEventId, eventTime) {
  return supabase.rpc('issue_item', {
    p_berth_id: berthId,
    p_item_type: itemType,
    p_item_seq: itemSeq,
    p_client_event_id: clientEventId,
    p_event_time: eventTime,
  })
}

export async function returnItem(berthId, itemType, itemSeq, clientEventId, eventTime) {
  return supabase.rpc('return_item', {
    p_berth_id: berthId,
    p_item_type: itemType,
    p_item_seq: itemSeq,
    p_client_event_id: clientEventId,
    p_event_time: eventTime,
  })
}

export async function ackBerthOtp(berthId, clientEventId, eventTime) {
  return supabase.rpc('ack_berth', {
    p_berth_id: berthId,
    p_ack_method: 'otp',
    p_client_event_id: clientEventId,
    p_event_time: eventTime,
  })
}

// --- Phase 4: QR path + admin reads

/**
 * Attendant-side: mints a short-lived, single-use token for a berth. The
 * caller displays this encoded as a QR code — see QrDisplay.jsx. Requires an
 * authenticated attendant session (RLS on qr_tokens enforces they're assigned
 * to this berth's coach).
 */
export async function generateQrToken(berthId) {
  const { data, error } = await supabase.rpc('generate_qr_token', { p_berth_id: berthId })
  if (error) throw error
  return data // the token itself, a uuid
}

/**
 * Passenger-side: consumes a token from the QR code. No login required —
 * ack_berth_via_qr is SECURITY DEFINER specifically so this works for an
 * anonymous session. Not routed through the outbox: this page has no local
 * state to be optimistic about, it's a single one-shot confirmation.
 */
export async function ackBerthViaQr(token) {
  return supabase.rpc('ack_berth_via_qr', { p_token: token })
}

/**
 * Admin/TTE: reads the unresolved_items view (docs/SCHEMA.md §3). RLS on the
 * underlying tables means an attendant calling this only ever sees their own
 * assigned berths, never other trains' data — the view doesn't need its own
 * separate access control, it inherits it from what it's built on.
 */
export async function fetchUnresolvedItems() {
  const { data, error } = await supabase.from('unresolved_items').select('*').order('train_no')
  if (error) throw error
  return data
}

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
 */
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

// --- Phase 2: writes. All three call the RPC functions from migration 005,
// which handle the ok/duplicate distinction server-side (see docs/API.md).
// client_event_id is generated fresh per call — safe even on retry, since the
// unique constraint on the server makes a retried call a harmless no-op.

export async function issueItem(berthId, itemType, itemSeq) {
  const { data, error } = await supabase.rpc('issue_item', {
    p_berth_id: berthId,
    p_item_type: itemType,
    p_item_seq: itemSeq,
    p_client_event_id: crypto.randomUUID(),
    p_event_time: new Date().toISOString(),
  })
  if (error) throw error
  return data
}

export async function returnItem(berthId, itemType, itemSeq) {
  const { data, error } = await supabase.rpc('return_item', {
    p_berth_id: berthId,
    p_item_type: itemType,
    p_item_seq: itemSeq,
    p_client_event_id: crypto.randomUUID(),
    p_event_time: new Date().toISOString(),
  })
  if (error) throw error
  return data
}

export async function ackBerthOtp(berthId) {
  const { data, error } = await supabase.rpc('ack_berth', {
    p_berth_id: berthId,
    p_ack_method: 'otp',
    p_client_event_id: crypto.randomUUID(),
    p_event_time: new Date().toISOString(),
  })
  if (error) throw error
  return data
}

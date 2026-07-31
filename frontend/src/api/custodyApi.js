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
export async function fetchBerthChart(coachId) {
  const { data, error } = await supabase
    .from('berths')
    .select(`
      berth_id, berth_no,
      passengers ( name, pnr ),
      item_current_status ( item_type, item_seq, current_status )
    `)
    .eq('coach_id', coachId)
    .order('berth_no')

  if (error) throw error
  return data
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

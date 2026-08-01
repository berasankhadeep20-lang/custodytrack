// Maps whatever supabase-js hands back to one of the outcomes the outbox cares
// about. This is a heuristic, not a guarantee — supabase-js doesn't give us a
// clean "this was a network failure" flag, so we infer it. Documented here so
// it's obvious this is a simplification appropriate for a portfolio MVP, not a
// claim that error classification in distributed systems is this easy in general.

export function classifySyncError(error) {
  if (!error) return 'ok'

  const looksLikeNetworkFailure =
    !error.code &&
    (/fetch/i.test(error.message ?? '') || /network/i.test(error.message ?? '') || error.name === 'TypeError')
  if (looksLikeNetworkFailure) return 'network'

  // 42501 = Postgres RLS policy violation. Supabase auth errors surface as 401.
  if (error.code === '42501' || error.status === 401 || error.status === 403) return 'auth'

  return 'validation'
}

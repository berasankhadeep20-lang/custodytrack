import { db } from './schema'

// status values:
//   pending  — ready to send whenever the sync engine next drains the queue
//   sending  — currently in flight (prevents the drain loop from double-sending
//              the same item if it's triggered twice in quick succession)
//   blocked  — hit an auth error; needs the attendant to re-authenticate before
//              this or anything queued after it can proceed

export async function enqueue(event) {
  const id = await db.outbox.add({
    ...event,
    status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString(),
    next_attempt_at: new Date().toISOString(), // eligible immediately
  })
  return id
}

export async function listReadyToSend() {
  const now = new Date().toISOString()
  const all = await db.outbox.where('status').equals('pending').sortBy('created_at')
  return all.filter((e) => e.next_attempt_at <= now)
}

export async function markSending(id) {
  await db.outbox.update(id, { status: 'sending' })
}

export async function removeSynced(id) {
  await db.outbox.delete(id)
}

export async function scheduleRetry(id, delayMs) {
  const nextAttempt = new Date(Date.now() + delayMs).toISOString()
  const row = await db.outbox.get(id)
  await db.outbox.update(id, {
    status: 'pending',
    retry_count: (row?.retry_count ?? 0) + 1,
    next_attempt_at: nextAttempt,
  })
}

export async function markBlocked(id, reason) {
  await db.outbox.update(id, { status: 'blocked', last_error: reason })
}

export async function dropWithError(id, reason) {
  // Validation errors: retrying won't help, but we don't silently lose the
  // event either — log it to console for now. A real product would want a
  // small "sync issues" log table the admin dashboard could surface; out of
  // scope for this MVP, noted here rather than silently discarded.
  console.warn(`Outbox item ${id} dropped (not retryable):`, reason)
  await db.outbox.delete(id)
}

export async function unblockAll() {
  // Called after the attendant re-authenticates — makes blocked items eligible again.
  await db.outbox.where('status').equals('blocked').modify({ status: 'pending', next_attempt_at: new Date().toISOString() })
}

export async function countPending() {
  return db.outbox.where('status').anyOf('pending', 'sending', 'blocked').count()
}

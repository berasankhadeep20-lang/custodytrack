import { issueItem, returnItem, ackBerthOtp } from '../api/custodyApi'
import * as outbox from '../db/outboxRepo'
import { classifySyncError } from './errorTaxonomy'
import { isOnline, subscribeToConnectivity } from './connectivity'

// --- Public interface: the UI calls these, never the raw api functions
// directly, once Phase 3 is wired in. Each one writes to the outbox
// immediately (instant local effect) and kicks a drain attempt right away —
// if online, that resolves in under a second; if offline, it just sits until
// connectivity returns, with zero special-casing needed at the call site.

export async function enqueueIssue(berthId, itemType, itemSeq) {
  const id = await outbox.enqueue({
    type: 'issue',
    berth_id: berthId,
    item_type: itemType,
    item_seq: itemSeq,
    client_event_id: crypto.randomUUID(),
    event_time: new Date().toISOString(),
  })
  drain()
  return id
}

export async function enqueueReturn(berthId, itemType, itemSeq) {
  const id = await outbox.enqueue({
    type: 'return',
    berth_id: berthId,
    item_type: itemType,
    item_seq: itemSeq,
    client_event_id: crypto.randomUUID(),
    event_time: new Date().toISOString(),
  })
  drain()
  return id
}

export async function enqueueAckOtp(berthId) {
  const id = await outbox.enqueue({
    type: 'ack_otp',
    berth_id: berthId,
    client_event_id: crypto.randomUUID(),
    event_time: new Date().toISOString(),
  })
  drain()
  return id
}

const listeners = new Set()

function notify(state) {
  listeners.forEach((fn) => fn(state))
}

export function onSyncStateChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function callForEvent(event) {
  if (event.type === 'issue') {
    return issueItem(event.berth_id, event.item_type, event.item_seq, event.client_event_id, event.event_time)
  }
  if (event.type === 'return') {
    return returnItem(event.berth_id, event.item_type, event.item_seq, event.client_event_id, event.event_time)
  }
  if (event.type === 'ack_otp') {
    return ackBerthOtp(event.berth_id, event.client_event_id, event.event_time)
  }
  throw new Error(`Unknown outbox event type: ${event.type}`)
}

function backoffDelay(retryCount) {
  // 1s, 2s, 4s, 8s... capped at 30s — generous enough for a demo, a real
  // deployment would tune this against actual observed reconnect patterns.
  return Math.min(30000, 1000 * 2 ** retryCount)
}

let draining = false

export async function drain() {
  if (draining) return // avoid two overlapping drain passes (e.g. timer + online event firing together)
  draining = true
  try {
    const ready = await outbox.listReadyToSend()
    for (const event of ready) {
      await outbox.markSending(event.id)
      let result, error
      try {
        ;({ data: result, error } = await callForEvent(event))
      } catch (thrown) {
        error = thrown
      }

      if (!error) {
        // result.status is 'ok' or 'duplicate' — both are success from the
        // outbox's perspective, per docs/API.md §3.
        await outbox.removeSynced(event.id)
        continue
      }

      const kind = classifySyncError(error)
      if (kind === 'auth') {
        await outbox.markBlocked(event.id, error.message)
        break // further items will almost certainly hit the same auth failure — stop this pass
      } else if (kind === 'network') {
        await outbox.scheduleRetry(event.id, backoffDelay(event.retry_count))
        break // connection is likely down entirely — stop hammering it this pass
      } else {
        await outbox.dropWithError(event.id, error.message)
        // validation errors are per-item, not systemic — keep processing the rest
      }
    }
  } finally {
    draining = false
    const pendingCount = await outbox.countPending()
    notify({ pendingCount, online: isOnline() })
  }
}

let started = false

export function startSyncLoop() {
  if (started) return
  started = true

  subscribeToConnectivity((online) => {
    notify({ online })
    if (online) drain()
  })

  // Periodic safety net — catches the case where navigator.onLine never fires
  // a clean 'online' event (some networks/browsers are inconsistent about it).
  setInterval(() => {
    if (isOnline()) drain()
  }, 10000)

  drain() // attempt immediately on startup too, in case items were queued last session
}

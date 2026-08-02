import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './schema'
import * as outbox from './outboxRepo'

beforeEach(async () => {
  await db.outbox.clear()
})

describe('outboxRepo', () => {
  it('enqueue() creates a row that is immediately ready to send', async () => {
    const id = await outbox.enqueue({ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1, client_event_id: 'ce1', event_time: new Date().toISOString() })
    const ready = await outbox.listReadyToSend()
    expect(ready).toHaveLength(1)
    expect(ready[0].id).toBe(id)
    expect(ready[0].status).toBe('pending')
    expect(ready[0].retry_count).toBe(0)
  })

  it('markSending() removes the item from listReadyToSend (prevents double-send)', async () => {
    const id = await outbox.enqueue({ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1, client_event_id: 'ce1', event_time: new Date().toISOString() })
    await outbox.markSending(id)
    const ready = await outbox.listReadyToSend()
    expect(ready).toHaveLength(0)
  })

  it('scheduleRetry() with a future delay makes the item NOT ready yet, and increments retry_count', async () => {
    const id = await outbox.enqueue({ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1, client_event_id: 'ce1', event_time: new Date().toISOString() })
    await outbox.markSending(id)
    await outbox.scheduleRetry(id, 60000) // 1 minute out

    const ready = await outbox.listReadyToSend()
    expect(ready).toHaveLength(0)

    const row = await db.outbox.get(id)
    expect(row.status).toBe('pending') // back to pending, just not eligible yet
    expect(row.retry_count).toBe(1)
  })

  it('scheduleRetry() with a zero/past delay makes the item ready immediately', async () => {
    const id = await outbox.enqueue({ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1, client_event_id: 'ce1', event_time: new Date().toISOString() })
    await outbox.markSending(id)
    await outbox.scheduleRetry(id, 0)

    const ready = await outbox.listReadyToSend()
    expect(ready).toHaveLength(1)
  })

  it('markBlocked() excludes the item from listReadyToSend until unblockAll() runs', async () => {
    const id = await outbox.enqueue({ type: 'ack_otp', berth_id: 'b1', client_event_id: 'ce1', event_time: new Date().toISOString() })
    await outbox.markSending(id)
    await outbox.markBlocked(id, 'session expired')

    expect(await outbox.listReadyToSend()).toHaveLength(0)

    await outbox.unblockAll()
    const ready = await outbox.listReadyToSend()
    expect(ready).toHaveLength(1)
    expect(ready[0].status).toBe('pending')
  })

  it('resetOrphanedSending() recovers an item stuck at "sending" — the actual bug found during live Phase 3 testing', async () => {
    const id = await outbox.enqueue({ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1, client_event_id: 'ce1', event_time: new Date().toISOString() })
    await outbox.markSending(id)
    // Simulate a crash/refresh here: nothing ever resolves the item, it's
    // just stuck at 'sending' — exactly what happened live before the fix.
    expect(await outbox.listReadyToSend()).toHaveLength(0)

    await outbox.resetOrphanedSending()
    const ready = await outbox.listReadyToSend()
    expect(ready).toHaveLength(1)
    expect(ready[0].status).toBe('pending')
  })

  it('removeSynced() and dropWithError() both remove the row entirely', async () => {
    const id1 = await outbox.enqueue({ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1, client_event_id: 'ce1', event_time: new Date().toISOString() })
    const id2 = await outbox.enqueue({ type: 'issue', berth_id: 'b2', item_type: 'pillow', item_seq: 1, client_event_id: 'ce2', event_time: new Date().toISOString() })

    await outbox.removeSynced(id1)
    await outbox.dropWithError(id2, 'malformed payload')

    expect(await db.outbox.get(id1)).toBeUndefined()
    expect(await db.outbox.get(id2)).toBeUndefined()
  })

  it('countPending() counts pending, sending, AND blocked — everything not yet resolved', async () => {
    const id1 = await outbox.enqueue({ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1, client_event_id: 'ce1', event_time: new Date().toISOString() })
    const id2 = await outbox.enqueue({ type: 'issue', berth_id: 'b2', item_type: 'pillow', item_seq: 1, client_event_id: 'ce2', event_time: new Date().toISOString() })
    const id3 = await outbox.enqueue({ type: 'ack_otp', berth_id: 'b3', client_event_id: 'ce3', event_time: new Date().toISOString() })

    await outbox.markSending(id2)
    await outbox.markSending(id3)
    await outbox.markBlocked(id3, 'expired session')

    expect(await outbox.countPending()).toBe(3)

    await outbox.removeSynced(id1)
    expect(await outbox.countPending()).toBe(2)
  })

  it('listReadyToSend() returns items in FIFO order by created_at', async () => {
    const idFirst = await outbox.enqueue({ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1, client_event_id: 'ce1', event_time: new Date().toISOString() })
    await new Promise((r) => setTimeout(r, 5))
    const idSecond = await outbox.enqueue({ type: 'issue', berth_id: 'b2', item_type: 'pillow', item_seq: 1, client_event_id: 'ce2', event_time: new Date().toISOString() })

    const ready = await outbox.listReadyToSend()
    expect(ready.map((e) => e.id)).toEqual([idFirst, idSecond])
  })
})

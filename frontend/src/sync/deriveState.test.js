import { describe, it, expect } from 'vitest'
import { applyOutboxOverlay } from './deriveState'

const baseBerths = [
  {
    berth_id: 'b1',
    items: [{ item_type: 'blanket', item_seq: 1, current_status: 'not issued' }],
    ack: null,
  },
  {
    berth_id: 'b2',
    items: [{ item_type: 'pillow', item_seq: 1, current_status: 'issued' }],
    ack: null,
  },
]

describe('applyOutboxOverlay', () => {
  it('leaves berths untouched when there are no pending events for them', () => {
    const result = applyOutboxOverlay(baseBerths, [])
    expect(result).toEqual(baseBerths)
  })

  it('overlays a pending "issue" event onto the matching item', () => {
    const pending = [{ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1 }]
    const result = applyOutboxOverlay(baseBerths, pending)

    const b1 = result.find((b) => b.berth_id === 'b1')
    expect(b1.items.find((i) => i.item_type === 'blanket').current_status).toBe('issued')
    // b2 should be unaffected
    const b2 = result.find((b) => b.berth_id === 'b2')
    expect(b2.items.find((i) => i.item_type === 'pillow').current_status).toBe('issued')
  })

  it('overlays a pending "return" event, flipping an already-issued item', () => {
    const pending = [{ type: 'return', berth_id: 'b2', item_type: 'pillow', item_seq: 1 }]
    const result = applyOutboxOverlay(baseBerths, pending)
    const b2 = result.find((b) => b.berth_id === 'b2')
    expect(b2.items.find((i) => i.item_type === 'pillow').current_status).toBe('returned')
  })

  it('adds a new item entry when the overlay references an item not in the base state', () => {
    const pending = [{ type: 'issue', berth_id: 'b1', item_type: 'towel', item_seq: 1 }]
    const result = applyOutboxOverlay(baseBerths, pending)
    const b1 = result.find((b) => b.berth_id === 'b1')
    expect(b1.items).toHaveLength(2) // original blanket + new towel
    expect(b1.items.find((i) => i.item_type === 'towel').current_status).toBe('issued')
  })

  it('overlays a pending ack_otp event as ack: { ack_method: "otp", pending: true }', () => {
    const pending = [{ type: 'ack_otp', berth_id: 'b1' }]
    const result = applyOutboxOverlay(baseBerths, pending)
    const b1 = result.find((b) => b.berth_id === 'b1')
    expect(b1.ack).toEqual({ ack_method: 'otp', pending: true })
  })

  it('does not mutate the original berths array or its objects', () => {
    const originalRef = baseBerths[0]
    const pending = [{ type: 'issue', berth_id: 'b1', item_type: 'blanket', item_seq: 1 }]
    applyOutboxOverlay(baseBerths, pending)
    // The original object's item status should still say 'not issued' —
    // overlay must produce new objects, not edit in place.
    expect(originalRef.items[0].current_status).toBe('not issued')
  })
})

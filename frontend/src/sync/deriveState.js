// Computes the "effective" berth chart the UI should show: the last confirmed
// server state, with any not-yet-synced local actions layered on top. This is
// what makes the UI feel instant even offline — the click updates this overlay
// immediately, before any network round-trip happens.

export function applyOutboxOverlay(berths, pendingEvents) {
  const overlayByBerth = {}

  for (const event of pendingEvents) {
    overlayByBerth[event.berth_id] ??= { items: [], ack: null }
    if (event.type === 'issue' || event.type === 'return') {
      overlayByBerth[event.berth_id].items.push({
        item_type: event.item_type,
        item_seq: event.item_seq,
        current_status: event.type === 'issue' ? 'issued' : 'returned',
      })
    } else if (event.type === 'ack_otp') {
      // pending: true lets the UI show "syncing…" instead of claiming a
      // confirmed ack_method before the server has actually agreed.
      overlayByBerth[event.berth_id].ack = { ack_method: 'otp', pending: true }
    }
  }

  return berths.map((berth) => {
    const overlay = overlayByBerth[berth.berth_id]
    if (!overlay) return berth

    const items = [...(berth.items ?? [])]
    for (const overlayItem of overlay.items) {
      const idx = items.findIndex(
        (i) => i.item_type === overlayItem.item_type && i.item_seq === overlayItem.item_seq
      )
      if (idx >= 0) items[idx] = overlayItem
      else items.push(overlayItem)
    }

    return { ...berth, items, ack: overlay.ack ?? berth.ack }
  })
}

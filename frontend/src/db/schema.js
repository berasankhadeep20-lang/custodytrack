import Dexie from 'dexie'

// One Dexie database, two tables:
//
// cachedCharts — one row per coach, holding the last-known-good berth chart as a
// single JSON blob (not one row per berth/item). This matches the "combine data
// that's updated together into a single key" pattern — we always read and write
// the whole chart together, so splitting it into many small rows would just mean
// more round-trips for no benefit.
//
// outbox — one row per queued write (issue/return/ack), FIFO by created_at.
// This is the actual source of truth for "what has the attendant done that the
// server might not know about yet."

export const db = new Dexie('custodytrack')

db.version(1).stores({
  cachedCharts: 'coach_id',
  outbox: '++id, status, created_at',
})

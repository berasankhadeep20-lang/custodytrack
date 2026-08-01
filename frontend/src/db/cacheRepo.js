import { db } from './schema'

export async function getCachedChart(coachId) {
  const row = await db.cachedCharts.get(coachId)
  return row?.berths ?? null
}

export async function setCachedChart(coachId, berths) {
  await db.cachedCharts.put({ coach_id: coachId, berths, cached_at: new Date().toISOString() })
}

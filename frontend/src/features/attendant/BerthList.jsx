import { useCallback, useEffect, useState } from 'react'
import { fetchAssignedCoach, fetchBerthChart, signOut } from '../../api/custodyApi'
import { getCachedChart, setCachedChart } from '../../db/cacheRepo'
import { db } from '../../db/schema'
import { applyOutboxOverlay } from '../../sync/deriveState'
import { onSyncStateChange, startSyncLoop } from '../../sync/syncEngine'
import { isOnline } from '../../sync/connectivity'
import BerthCard from './BerthCard'
import ConnectivityIndicator from '../../components/ConnectivityIndicator'

export default function BerthList() {
  const [coach, setCoach] = useState(null)
  const [baseBerths, setBaseBerths] = useState([])
  const [pendingEvents, setPendingEvents] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncState, setSyncState] = useState({ pendingCount: 0, online: isOnline() })

  const refreshPending = useCallback(async () => {
    const all = await db.outbox.toArray()
    setPendingEvents(all)
  }, [])

  const refreshFromServer = useCallback(async (coachId) => {
    if (!isOnline()) return // don't even attempt — avoids a guaranteed-to-fail request
    try {
      const chart = await fetchBerthChart(coachId)
      setBaseBerths(chart)
      await setCachedChart(coachId, chart)
    } catch (err) {
      // Network blip or genuinely offline despite navigator.onLine saying otherwise —
      // the cached/optimistic view already on screen is still valid, so this is a
      // soft failure, not something to surface as an error banner.
      console.warn('Chart refresh failed, keeping current view:', err.message)
    }
  }, [])

  // Sync engine lifecycle + status subscription
  useEffect(() => {
    startSyncLoop()
    return onSyncStateChange((state) => setSyncState((s) => ({ ...s, ...state })))
  }, [])

  // Initial load: cache first (instant, works offline), then a network refresh
  useEffect(() => {
    async function load() {
      try {
        const assignedCoach = await fetchAssignedCoach()
        setCoach(assignedCoach)

        const cached = await getCachedChart(assignedCoach.coach_id)
        if (cached) {
          setBaseBerths(cached)
          setLoading(false)
        }
        await refreshFromServer(assignedCoach.coach_id)
        if (!cached) setLoading(false)
        await refreshPending()
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    load()
  }, [refreshFromServer, refreshPending])

  // Periodic reconciliation: pulls confirmed server state + drops the overlay
  // for anything that's synced by now. This is what turns "optimistic" into
  // "confirmed" without the attendant having to do anything.
  useEffect(() => {
    if (!coach) return
    const interval = setInterval(() => {
      refreshFromServer(coach.coach_id)
      refreshPending()
    }, 3000)
    return () => clearInterval(interval)
  }, [coach, refreshFromServer, refreshPending])

  const berths = applyOutboxOverlay(baseBerths, pendingEvents)

  if (loading) return <div className="p-6 text-muted">Loading berth chart…</div>
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-lg font-semibold">
            Coach {coach?.coaches?.coach_number} — {coach?.coaches?.coach_class}
          </h1>
          <p className="text-sm text-muted">
            Train {coach?.coaches?.journeys?.train_no} · {coach?.coaches?.journeys?.journey_date}
          </p>
        </div>
        <button onClick={signOut} className="text-sm text-muted hover:text-white">
          Sign out
        </button>
      </div>

      <div className="mb-4">
        <ConnectivityIndicator syncState={syncState} />
      </div>

      <div className="grid gap-3">
        {berths.map((berth) => (
          <BerthCard key={berth.berth_id} berth={berth} onActionQueued={refreshPending} />
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { fetchAssignedCoach, fetchBerthChart, signOut } from '../../api/custodyApi'
import BerthCard from './BerthCard'

export default function BerthList() {
  const [coach, setCoach] = useState(null)
  const [berths, setBerths] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const assignedCoach = await fetchAssignedCoach()
        setCoach(assignedCoach)
        const chart = await fetchBerthChart(assignedCoach.coach_id)
        setBerths(chart)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-6 text-muted">Loading berth chart…</div>
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
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

      <div className="grid gap-3">
        {berths.map((berth) => (
          <BerthCard key={berth.berth_id} berth={berth} />
        ))}
      </div>
    </div>
  )
}

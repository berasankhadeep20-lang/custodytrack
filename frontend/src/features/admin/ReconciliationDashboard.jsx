import { useEffect, useState } from 'react'
import { fetchUnresolvedItems } from '../../api/custodyApi'

export default function ReconciliationDashboard() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUnresolvedItems()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-muted text-sm">Loading…</p>
  if (error) return <p className="text-red-400 text-sm">Error: {error}</p>
  if (items.length === 0) return <p className="text-muted text-sm">No unresolved items — everything reconciled.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted border-b border-border">
            <th className="py-2 pr-3">Train</th>
            <th className="pr-3">Coach</th>
            <th className="pr-3">Berth</th>
            <th className="pr-3">Passenger</th>
            <th className="pr-3">PNR</th>
            <th className="pr-3">Item</th>
            <th>Issued</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 pr-3">{item.train_no}</td>
              <td className="pr-3">{item.coach_number}</td>
              <td className="pr-3">{item.berth_no}</td>
              <td className="pr-3">{item.name}</td>
              <td className="pr-3 font-mono text-xs">{item.pnr}</td>
              <td className="pr-3">
                {item.item_type}
                {item.item_seq > 1 ? ` ${item.item_seq}` : ''}
              </td>
              <td className="text-muted text-xs">{new Date(item.issued_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

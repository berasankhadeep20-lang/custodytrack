import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchUnresolvedItems } from '../../api/custodyApi'

export default function LossAnalyticsChart() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchUnresolvedItems().then((items) => {
      const counts = {}
      for (const item of items) {
        counts[item.train_no] = (counts[item.train_no] ?? 0) + 1
      }
      setData(Object.entries(counts).map(([train_no, count]) => ({ train_no, count })))
    })
  }, [])

  if (data === null) return <p className="text-muted text-sm">Loading…</p>
  if (data.length === 0) return <p className="text-muted text-sm">Not enough data yet for a chart.</p>

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#22303c" />
        <XAxis dataKey="train_no" stroke="#8b98a5" fontSize={12} />
        <YAxis stroke="#8b98a5" fontSize={12} allowDecimals={false} />
        <Tooltip contentStyle={{ background: '#121820', border: '1px solid #22303c', color: '#e6edf3' }} />
        <Bar dataKey="count" fill="#4fb3ff" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

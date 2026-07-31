const ITEMS = [
  { type: 'blanket', seq: 1, label: 'Blanket' },
  { type: 'pillow', seq: 1, label: 'Pillow' },
  { type: 'bedsheet', seq: 1, label: 'Bedsheet 1' },
  { type: 'bedsheet', seq: 2, label: 'Bedsheet 2' },
  { type: 'towel', seq: 1, label: 'Towel' },
]

function statusFor(berth, item) {
  const match = berth.item_current_status?.find(
    (s) => s.item_type === item.type && s.item_seq === item.seq
  )
  return match?.current_status ?? 'not issued'
}

function StatusBadge({ status }) {
  const styles = {
    'not issued': 'bg-border text-muted',
    issued: 'bg-warn/20 text-warn',
    returned: 'bg-accent2/20 text-accent2',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status]}`}>{status}</span>
  )
}

export default function BerthCard({ berth }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-medium">Berth {berth.berth_no}</h3>
        <span className="text-sm text-muted">{berth.passengers?.name}</span>
      </div>
      <p className="text-xs text-muted mb-3 font-mono">{berth.passengers?.pnr}</p>
      <div className="flex flex-wrap gap-2">
        {ITEMS.map((item) => (
          <div key={`${item.type}-${item.seq}`} className="flex items-center gap-1.5">
            <span className="text-sm">{item.label}</span>
            <StatusBadge status={statusFor(berth, item)} />
          </div>
        ))}
      </div>
      {/* Issue / ack / return controls are Phase 2 — this view is read-only for now */}
    </div>
  )
}

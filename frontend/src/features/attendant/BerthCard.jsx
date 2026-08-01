import { useState } from 'react'
import { issueItem, returnItem } from '../../api/custodyApi'
import AckModal from './AckModal'

const ITEMS = [
  { type: 'blanket', seq: 1, label: 'Blanket' },
  { type: 'pillow', seq: 1, label: 'Pillow' },
  { type: 'bedsheet', seq: 1, label: 'Bedsheet 1' },
  { type: 'bedsheet', seq: 2, label: 'Bedsheet 2' },
  { type: 'towel', seq: 1, label: 'Towel' },
]

function statusFor(berth, item) {
  const match = berth.items?.find((s) => s.item_type === item.type && s.item_seq === item.seq)
  return match?.current_status ?? 'not issued'
}

function StatusBadge({ status }) {
  const styles = {
    'not issued': 'bg-border text-muted',
    issued: 'bg-warn/20 text-warn',
    returned: 'bg-accent2/20 text-accent2',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status]}`}>{status}</span>
}

export default function BerthCard({ berth, onChanged }) {
  const [showAck, setShowAck] = useState(false)
  const [busyKey, setBusyKey] = useState(null) // which item is mid-request, to disable its button only
  const [error, setError] = useState(null)

  async function handleToggle(item, currentStatus) {
    const key = `${item.type}-${item.seq}`
    setBusyKey(key)
    setError(null)
    try {
      if (currentStatus === 'not issued') {
        await issueItem(berth.berth_id, item.type, item.seq)
      } else if (currentStatus === 'issued') {
        await returnItem(berth.berth_id, item.type, item.seq)
      }
      // 'returned' is terminal for this MVP — no un-return action.
      onChanged() // parent refetches; Phase 3 will make this optimistic instead
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-medium">Berth {berth.berth_no}</h3>
        <span className="text-sm text-muted">{berth.passengers?.name}</span>
      </div>
      <p className="text-xs text-muted mb-3 font-mono">{berth.passengers?.pnr}</p>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted">Acknowledgment</span>
        {berth.ack ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent2/20 text-accent2">
            acked via {berth.ack.ack_method}
          </span>
        ) : (
          <button
            onClick={() => setShowAck(true)}
            className="text-xs px-2 py-1 rounded-full border border-accent text-accent"
          >
            Acknowledge
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {ITEMS.map((item) => {
          const status = statusFor(berth, item)
          const key = `${item.type}-${item.seq}`
          const clickable = status !== 'returned'
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{item.label}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                {clickable && (
                  <button
                    onClick={() => handleToggle(item, status)}
                    disabled={busyKey === key}
                    className="text-xs px-2 py-0.5 rounded border border-border text-muted hover:text-white hover:border-accent disabled:opacity-40"
                  >
                    {status === 'not issued' ? 'Issue' : 'Return'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

      {showAck && (
        <AckModal
          berthId={berth.berth_id}
          onClose={() => setShowAck(false)}
          onAcked={onChanged}
        />
      )}
    </div>
  )
}

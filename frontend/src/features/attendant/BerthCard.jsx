import { useState } from 'react'
import { enqueueIssue, enqueueReturn } from '../../sync/syncEngine'
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

export default function BerthCard({ berth, onActionQueued }) {
  const [showAck, setShowAck] = useState(false)

  // Enqueuing is synchronous from the UI's perspective — it writes to IndexedDB
  // and returns almost instantly, then kicks a sync attempt in the background.
  // No try/catch needed here the way Phase 2's direct calls needed one: writing
  // to the local outbox essentially can't fail the way a network call can.
  async function handleToggle(item, currentStatus) {
    if (currentStatus === 'not issued') {
      await enqueueIssue(berth.berth_id, item.type, item.seq)
    } else if (currentStatus === 'issued') {
      await enqueueReturn(berth.berth_id, item.type, item.seq)
    }
    onActionQueued()
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
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              berth.ack.pending ? 'bg-warn/20 text-warn' : 'bg-accent2/20 text-accent2'
            }`}
          >
            {berth.ack.pending ? 'syncing…' : `acked via ${berth.ack.ack_method}`}
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
                    className="text-xs px-2 py-0.5 rounded border border-border text-muted hover:text-white hover:border-accent"
                  >
                    {status === 'not issued' ? 'Issue' : 'Return'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAck && (
        <AckModal
          berthId={berth.berth_id}
          onClose={() => setShowAck(false)}
          onAcked={onActionQueued}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import OtpEntry from './OtpEntry'

export default function AckModal({ berthId, onClose, onAcked }) {
  const [method, setMethod] = useState(null) // null | 'otp'

  function handleDone() {
    onAcked()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-panel border border-border rounded-xl p-5 w-full max-w-sm">
        <h2 className="font-medium mb-4">Acknowledge berth</h2>

        {!method && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod('otp')}
              className="border border-accent text-accent rounded-lg py-3"
            >
              OTP
            </button>
            <button
              disabled
              title="QR acknowledgment ships in Phase 4"
              className="border border-border text-muted rounded-lg py-3 opacity-50 cursor-not-allowed"
            >
              QR (Phase 4)
            </button>
          </div>
        )}

        {method === 'otp' && (
          <OtpEntry berthId={berthId} onDone={handleDone} onCancel={() => setMethod(null)} />
        )}

        {!method && (
          <button onClick={onClose} className="mt-4 text-sm text-muted hover:text-white">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import OtpEntry from './OtpEntry'
import QrDisplay from './QrDisplay'

export default function AckModal({ berthId, onClose, onAcked }) {
  const [method, setMethod] = useState(null) // null | 'otp' | 'qr'

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
            <button onClick={() => setMethod('otp')} className="border border-accent text-accent rounded-lg py-3">
              OTP
            </button>
            <button onClick={() => setMethod('qr')} className="border border-accent text-accent rounded-lg py-3">
              QR
            </button>
          </div>
        )}

        {method === 'otp' && (
          <OtpEntry berthId={berthId} onDone={handleDone} onCancel={() => setMethod(null)} />
        )}

        {method === 'qr' && (
          <QrDisplay berthId={berthId} onCancel={handleDone} />
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

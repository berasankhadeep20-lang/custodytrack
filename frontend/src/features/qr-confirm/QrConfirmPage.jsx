import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ackBerthViaQr } from '../../api/custodyApi'

const MESSAGES = {
  confirming: 'Confirming…',
  ok: 'Thanks — your linen items are now acknowledged.',
  duplicate: "This has already been confirmed. You're all set.",
  expired: 'This code has expired. Please ask the coach attendant for a new one.',
  invalid_token: 'This link is not valid. Please ask the coach attendant for a new code.',
  error: 'Something went wrong. Please ask the coach attendant to try again.',
}

export default function QrConfirmPage() {
  const { token } = useParams()
  const [status, setStatus] = useState('confirming')

  useEffect(() => {
    let cancelled = false
    async function confirm() {
      const { data, error } = await ackBerthViaQr(token)
      if (cancelled) return
      if (error) {
        setStatus('error')
        return
      }
      // data.status is one of: ok | duplicate | expired | invalid_token
      // — see migration 006's ack_berth_via_qr for exactly what each means.
      setStatus(data.status)
    }
    confirm()
    return () => { cancelled = true }
  }, [token])

  const isSuccess = status === 'ok' || status === 'duplicate'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold mb-3">CustodyTrack</h1>
        <div
          className={`rounded-lg border px-4 py-3 ${
            isSuccess ? 'border-accent2 text-accent2' : status === 'confirming' ? 'border-border text-muted' : 'border-warn text-warn'
          }`}
        >
          {MESSAGES[status]}
        </div>
      </div>
    </div>
  )
}

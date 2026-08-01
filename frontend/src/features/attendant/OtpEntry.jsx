import { useState, useMemo } from 'react'
import { ackBerthOtp } from '../../api/custodyApi'

export default function OtpEntry({ berthId, onDone, onCancel }) {
  // No real SMS provider in this MVP (per SRS §2.1/2.4) — we generate a code here
  // and display it as if it were sent to the passenger's phone, so the attendant
  // still goes through the real "read it out, type it in" motion for the demo.
  const simulatedCode = useMemo(() => String(Math.floor(100000 + Math.random() * 900000)), [])
  const [entered, setEntered] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (entered !== simulatedCode) {
      setError('Code does not match. Ask the passenger to read it again.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await ackBerthOtp(berthId)
      // 'duplicate' happens if this berth was already acknowledged (e.g. retry,
      // or QR beat OTP to it) — treated as success, per docs/API.md §3.
      onDone(result)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-muted">
        Simulated OTP sent to passenger's phone: <span className="font-mono text-accent">{simulatedCode}</span>
      </p>
      <input
        type="text"
        inputMode="numeric"
        placeholder="Enter code"
        value={entered}
        onChange={(e) => setEntered(e.target.value)}
        className="w-full bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-accent font-mono"
        maxLength={6}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || entered.length !== 6}
          className="flex-1 bg-accent text-bg font-medium rounded-lg py-2 disabled:opacity-50"
        >
          {submitting ? 'Confirming…' : 'Confirm'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 text-muted hover:text-white">
          Cancel
        </button>
      </div>
    </form>
  )
}

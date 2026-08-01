import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { generateQrToken } from '../../api/custodyApi'

export default function QrDisplay({ berthId, onCancel }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [confirmUrl, setConfirmUrl] = useState(null)
  const [error, setError] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(300) // matches the 5-minute expiry in migration 006
  const tickRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function generate() {
      try {
        const token = await generateQrToken(berthId)
        // BASE_URL already includes the trailing slash Vite's base config adds
        // (e.g. "/custodytrack/"), so this resolves correctly both in dev and
        // once deployed to GitHub Pages.
        const confirmUrl = `${window.location.origin}${import.meta.env.BASE_URL}confirm/${token}`
        const dataUrl = await QRCode.toDataURL(confirmUrl, { margin: 1, width: 220 })
        if (!cancelled) {
          setImageUrl(dataUrl)
          setConfirmUrl(confirmUrl)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    generate()

    tickRef.current = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => {
      cancelled = true
      clearInterval(tickRef.current)
    }
  }, [berthId])

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="text-center">
      <p className="text-sm text-muted mb-3">Ask the passenger to scan this with their phone camera</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {imageUrl && (
        <>
          <img src={imageUrl} alt="Acknowledgment QR code" className="mx-auto rounded-lg bg-white p-2" width={220} height={220} />
          <p className="text-xs text-muted mt-2">
            {secondsLeft > 0 ? `Expires in ${mm}:${ss}` : 'Expired — close and try again'}
          </p>
          <div className="mt-3 bg-bg border border-border rounded px-2 py-1.5">
            <p className="text-[10px] text-muted mb-1">For local testing — open this in an incognito/private window:</p>
            <p className="text-xs font-mono break-all select-all">{confirmUrl}</p>
          </div>
        </>
      )}
      <p className="text-xs text-muted mt-3">
        The chart updates automatically once the passenger confirms — no need to check manually.
      </p>
      <button onClick={onCancel} className="mt-3 text-sm text-muted hover:text-white">
        Close
      </button>
    </div>
  )
}

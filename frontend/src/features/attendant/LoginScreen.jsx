import { useState } from 'react'
import { signIn } from '../../api/custodyApi'

export default function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await signIn(email, password)
      onLoggedIn(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-panel border border-border rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-1">CustodyTrack</h1>
        <p className="text-muted text-sm mb-6">Attendant login</p>

        <label className="block text-sm text-muted mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 mb-4 outline-none focus:border-accent"
          required
        />

        <label className="block text-sm text-muted mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 mb-4 outline-none focus:border-accent"
          required
        />

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-bg font-medium rounded-lg py-2 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

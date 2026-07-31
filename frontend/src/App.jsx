import { useEffect, useState } from 'react'
import { getSession, onAuthChange } from './api/custodyApi'
import LoginScreen from './features/attendant/LoginScreen'
import BerthList from './features/attendant/BerthList'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = not checked yet

  useEffect(() => {
    getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = onAuthChange((s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>
  }

  return session ? <BerthList /> : <LoginScreen onLoggedIn={setSession} />
}

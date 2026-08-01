import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getSession, onAuthChange } from './api/custodyApi'
import LoginScreen from './features/attendant/LoginScreen'
import BerthList from './features/attendant/BerthList'
import AdminDashboard from './features/admin/AdminDashboard'
import QrConfirmPage from './features/qr-confirm/QrConfirmPage'

// Shared by both the attendant and admin routes — everything except
// /confirm/:token requires a session. Which screen renders once logged in
// (BerthList vs AdminDashboard) is decided by the route, not by role — RLS is
// what actually restricts what data comes back either way, so this is a
// convenience split, not the security boundary. See docs/SCHEMA.md §4.
function RequireSession({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = onAuthChange((s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>
  }
  return session ? children : <LoginScreen onLoggedIn={setSession} />
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* The one public route in the whole app — no session, no RequireSession wrapper. */}
        <Route path="/confirm/:token" element={<QrConfirmPage />} />
        <Route path="/admin" element={<RequireSession><AdminDashboard /></RequireSession>} />
        <Route path="/*" element={<RequireSession><BerthList /></RequireSession>} />
      </Routes>
    </BrowserRouter>
  )
}

import { signOut } from '../../api/custodyApi'
import LossAnalyticsChart from './LossAnalyticsChart'
import ReconciliationDashboard from './ReconciliationDashboard'

export default function AdminDashboard() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Reconciliation — Admin</h1>
        <button onClick={signOut} className="text-sm text-muted hover:text-white">
          Sign out
        </button>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mb-6">
        <h2 className="text-sm text-muted mb-3">Unresolved items by train</h2>
        <LossAnalyticsChart />
      </div>

      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-sm text-muted mb-3">Unresolved items</h2>
        <ReconciliationDashboard />
      </div>
    </div>
  )
}

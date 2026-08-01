export default function ConnectivityIndicator({ syncState }) {
  const { online, pendingCount } = syncState

  if (online && pendingCount === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <span className="w-1.5 h-1.5 rounded-full bg-accent2" /> Synced
      </div>
    )
  }

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warn">
        <span className="w-1.5 h-1.5 rounded-full bg-warn" /> Offline
        {pendingCount > 0 && ` — ${pendingCount} change${pendingCount === 1 ? '' : 's'} queued`}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-accent">
      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Syncing {pendingCount} change{pendingCount === 1 ? '' : 's'}…
    </div>
  )
}

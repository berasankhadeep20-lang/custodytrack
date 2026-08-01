// navigator.onLine is not fully reliable — it can report "online" when connected
// to a wifi network with no real internet (a captive portal, for instance). We
// use it as a *hint* to trigger sync attempts promptly, but the actual source of
// truth is always whether a real request to Supabase succeeds or fails — see
// syncEngine.js's error classification. This function is deliberately not the
// only thing gating sync attempts.

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function subscribeToConnectivity(onChange) {
  function goOnline() { onChange(true) }
  function goOffline() { onChange(false) }
  window.addEventListener('online', goOnline)
  window.addEventListener('offline', goOffline)
  return () => {
    window.removeEventListener('online', goOnline)
    window.removeEventListener('offline', goOffline)
  }
}

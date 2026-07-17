import { useAuth } from '../lib/AuthContext'

export default function AppHeader() {
  const { session, signOut } = useAuth()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span className="muted" style={{ fontSize: 13 }}>{session?.user?.email}</span>
      <button
        className="btn btn-secondary"
        style={{ width: 'auto', minHeight: 36, padding: '0 12px', fontSize: 13 }}
        onClick={signOut}
      >
        Sign out
      </button>
    </div>
  )
}

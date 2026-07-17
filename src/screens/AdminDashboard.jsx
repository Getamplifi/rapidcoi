import Card from '../components/Card'
import AppHeader from '../components/AppHeader'

export default function AdminDashboard() {
  return (
    <div className="screen">
      <AppHeader />
      <h1>Admin</h1>
      <Card>
        <p className="muted">Account and carrier management — coming later.</p>
      </Card>
    </div>
  )
}

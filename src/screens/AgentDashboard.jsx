import Card from '../components/Card'
import AppHeader from '../components/AppHeader'

export default function AgentDashboard() {
  return (
    <div className="screen">
      <AppHeader />
      <h1>Review Queue</h1>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Acme Roofing</h3>
          <span className="badge badge-success">Ready for review</span>
        </div>
        <p className="muted">Placeholder — real queue comes in step 9.</p>
      </Card>
    </div>
  )
}

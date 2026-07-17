import Card from '../components/Card'
import Button from '../components/Button'

export default function ContractorDashboard() {
  return (
    <div className="screen">
      <h1>Dashboard</h1>
      <Card>
        <h2>Need a COI for a new job?</h2>
        <p className="muted">Your policy info is already on file. Just add the job site and any exceptions.</p>
        <Button variant="gold">Request a COI</Button>
      </Card>
    </div>
  )
}

import Card from '../components/Card'
import Button from '../components/Button'

export default function Login() {
  return (
    <div className="screen">
      <h1>RapidCOI</h1>
      <p className="muted">Your COI. In minutes.</p>
      <Card>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" placeholder="you@company.com" />
        <div style={{ height: 12 }} />
        <Button variant="primary">Send magic link</Button>
      </Card>
    </div>
  )
}

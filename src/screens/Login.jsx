import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  if (status === 'sent') {
    return (
      <div className="screen">
        <h1>RapidCOI</h1>
        <Card>
          <h2>Check your email</h2>
          <p className="muted">We sent a magic link to {email}. Click it to sign in.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>RapidCOI</h1>
      <p className="muted">Your COI. In minutes.</p>
      <Card>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div style={{ height: 12 }} />
          <Button type="submit" variant="primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send magic link'}
          </Button>
          {status === 'error' && (
            <p style={{ color: 'var(--color-error)', marginTop: 12, marginBottom: 0 }}>{errorMsg}</p>
          )}
        </form>
      </Card>
    </div>
  )
}

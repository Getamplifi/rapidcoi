import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import AppHeader from '../components/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS_LABELS = {
  ready_for_review: { text: 'Ready for review', badge: 'badge-success' },
  flagged: { text: 'Needs review', badge: 'badge-warning' },
  sent: { text: 'Sent', badge: 'badge-success' },
  rejected: { text: 'Rejected', badge: 'badge-error' },
}

export default function AgentRequestDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [request, setRequest] = useState(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | error | rejecting

  function load() {
    supabase
      .from('coi_requests')
      .select('*, contractor:profiles!coi_requests_contractor_id_fkey(business_name, contact_name, phone)')
      .eq('id', id)
      .single()
      .then(({ data }) => setRequest(data))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSend(e) {
    e.preventDefault()
    setStatus('sending')
    const res = await fetch('/api/send-coi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ requestId: id, recipientEmail }),
    })
    const body = await res.json()
    if (!res.ok) {
      setStatus('error')
      return
    }
    load()
    setStatus('idle')
  }

  async function handleReject() {
    setStatus('rejecting')
    await supabase.from('coi_requests').update({ status: 'rejected' }).eq('id', id)
    load()
    setStatus('idle')
  }

  if (!request) {
    return (
      <div className="screen">
        <AppHeader />
        <p className="muted">Loading...</p>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[request.status] || { text: request.status, badge: 'badge-warning' }
  const alreadySent = request.status === 'sent'
  const alreadyRejected = request.status === 'rejected'

  return (
    <div className="screen">
      <AppHeader />
      <Button variant="secondary" onClick={() => navigate('/agent')}>
        ← Back to queue
      </Button>
      <div className="section-spacer" />

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={{ margin: 0 }}>{request.contractor?.business_name}</h2>
          <span className={`badge ${statusInfo.badge}`}>{statusInfo.text}</span>
        </div>

        <div className="section-spacer" />
        <div className="review-row">
          <span className="muted">Certificate holder</span>
          <span style={{ textAlign: 'right' }}>{request.certificate_holder_name}</span>
        </div>
        <div className="review-row">
          <span className="muted">Address</span>
          <span style={{ textAlign: 'right' }}>{request.certificate_holder_address}</span>
        </div>
        <div className="review-row">
          <span className="muted">Operations</span>
          <span style={{ textAlign: 'right' }}>{request.description_of_operations || '—'}</span>
        </div>
        <div className="review-row">
          <span className="muted">Exceptions</span>
          <span>{request.has_exceptions ? 'Yes' : 'No'}</span>
        </div>
        {request.has_exceptions && (
          <div className="review-row">
            <span className="muted">Details</span>
            <span style={{ textAlign: 'right' }}>{request.exception_details}</span>
          </div>
        )}

        <div className="section-spacer" />

        {request.pdf_url ? (
          <a href={request.pdf_url} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="secondary">
              View generated PDF
            </Button>
          </a>
        ) : (
          <p className="muted">PDF is still generating — refresh in a moment.</p>
        )}
      </Card>

      {!alreadySent && !alreadyRejected && (
        <>
          <div className="section-spacer" />
          <Card>
            <h2>Send to client / underwriting</h2>
            <form onSubmit={handleSend}>
              <div className="field-group">
                <label htmlFor="recipient_email">Recipient email</label>
                <input
                  id="recipient_email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="coi@theircompany.com"
                  required
                />
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                The contractor will automatically be CC'd for their records.
              </p>
              <Button type="submit" variant="gold" disabled={status === 'sending' || !request.pdf_url}>
                {status === 'sending' ? 'Sending...' : 'Send'}
              </Button>
              {status === 'error' && (
                <p style={{ color: 'var(--color-error)', marginTop: 12, marginBottom: 0 }}>
                  Something went wrong sending this. Try again.
                </p>
              )}
            </form>
            <div className="section-spacer" />
            <Button type="button" variant="secondary" onClick={handleReject} disabled={status === 'rejecting'}>
              {status === 'rejecting' ? 'Rejecting...' : 'Reject this request'}
            </Button>
          </Card>
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import AppHeader from '../components/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS_LABELS = {
  ready_for_review: { text: 'Being reviewed', badge: 'badge-warning' },
  flagged: { text: 'Being reviewed', badge: 'badge-warning' },
  sent: { text: 'Sent', badge: 'badge-success' },
  rejected: { text: 'Rejected', badge: 'badge-error' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ContractorHistory() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState(null)

  useEffect(() => {
    supabase
      .from('coi_requests')
      .select('*')
      .eq('contractor_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRequests(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen">
      <AppHeader />
      <Button variant="secondary" onClick={() => navigate('/contractor')}>
        ← Back to dashboard
      </Button>
      <div className="section-spacer" />
      <h1>Your requests</h1>

      {requests === null && <p className="muted">Loading...</p>}

      {requests !== null && requests.length === 0 && (
        <Card>
          <p className="muted" style={{ marginBottom: 0 }}>
            You haven't requested a COI yet.
          </p>
        </Card>
      )}

      {requests?.map((r) => {
        const statusInfo = STATUS_LABELS[r.status] || { text: r.status, badge: 'badge-warning' }
        return (
          <Card key={r.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0 }}>{r.certificate_holder_name}</h3>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  Requested {formatDate(r.created_at)}
                </p>
              </div>
              <span className={`badge ${statusInfo.badge}`}>{statusInfo.text}</span>
            </div>
            {r.pdf_url && r.status === 'sent' && (
              <>
                <div className="section-spacer" />
                <a href={r.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="secondary">
                    View certificate
                  </Button>
                </a>
              </>
            )}
          </Card>
        )
      })}
    </div>
  )
}

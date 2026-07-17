import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import AppHeader from '../components/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS_LABELS = {
  ready_for_review: { text: 'Ready for review', badge: 'badge-success' },
  flagged: { text: 'Needs review', badge: 'badge-warning' },
  sent: { text: 'Sent', badge: 'badge-success' },
  rejected: { text: 'Rejected', badge: 'badge-error' },
}

export default function AgentDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState(null)

  useEffect(() => {
    supabase
      .from('coi_requests')
      .select('*, contractor:profiles!coi_requests_contractor_id_fkey(business_name)')
      .eq('agent_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRequests(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen">
      <AppHeader />
      <h1>Review Queue</h1>

      {requests === null && <p className="muted">Loading...</p>}

      {requests !== null && requests.length === 0 && (
        <Card>
          <p className="muted" style={{ marginBottom: 0 }}>
            No requests yet. New COI requests from your contractors will show up here.
          </p>
        </Card>
      )}

      {requests?.map((r) => {
        const statusInfo = STATUS_LABELS[r.status] || { text: r.status, badge: 'badge-warning' }
        return (
          <div key={r.id} className="section-spacer" style={{ height: 0 }}>
            <Card onClick={() => navigate(`/agent/request/${r.id}`)} style={{ cursor: 'pointer', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{r.contractor?.business_name || 'Unknown contractor'}</h3>
                  <p className="muted" style={{ margin: '4px 0 0' }}>{r.certificate_holder_name}</p>
                </div>
                <span className={`badge ${statusInfo.badge}`}>{statusInfo.text}</span>
              </div>
            </Card>
          </div>
        )
      })}
    </div>
  )
}

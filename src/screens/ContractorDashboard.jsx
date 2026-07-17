import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import AppHeader from '../components/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function ContractorDashboard() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [hasPolicies, setHasPolicies] = useState(false)

  useEffect(() => {
    supabase
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', session.user.id)
      .then(({ count }) => {
        setHasPolicies((count || 0) > 0)
        setOnboardingChecked(true)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (onboardingChecked && !hasPolicies) {
      navigate('/contractor/onboarding', { replace: true })
    }
  }, [onboardingChecked, hasPolicies, navigate])

  if (!onboardingChecked || !hasPolicies) {
    return (
      <div className="screen">
        <p className="muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <AppHeader />
      <h1>Dashboard</h1>
      <p className="muted">{profile.business_name}</p>
      <Card>
        <h2>Need a COI for a new job?</h2>
        <p className="muted">Your policy info is already on file. Just add the job site and any exceptions.</p>
        <Button variant="gold" onClick={() => navigate('/contractor/request')}>
          Request a COI
        </Button>
      </Card>
      <div className="section-spacer" />
      <Button variant="secondary" onClick={() => navigate('/contractor/history')}>
        View past requests
      </Button>
    </div>
  )
}

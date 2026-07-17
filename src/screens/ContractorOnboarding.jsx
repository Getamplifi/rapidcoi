import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import AppHeader from '../components/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { POLICY_TYPES, emptyPolicy } from '../lib/policyTypes'

export default function ContractorOnboarding() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [businessName, setBusinessName] = useState(profile?.business_name || '')
  const [contactName, setContactName] = useState(profile?.contact_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  const [policies, setPolicies] = useState(() => {
    const initial = {}
    POLICY_TYPES.forEach((t) => {
      initial[t.key] = emptyPolicy()
    })
    return initial
  })

  const [status, setStatus] = useState('idle') // idle | saving | error
  const [errorMsg, setErrorMsg] = useState('')

  function updatePolicyField(typeKey, field, value) {
    setPolicies((prev) => ({
      ...prev,
      [typeKey]: { ...prev[typeKey], [field]: value },
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ business_name: businessName, contact_name: contactName, phone })
      .eq('id', session.user.id)

    if (profileError) {
      setStatus('error')
      setErrorMsg(profileError.message)
      return
    }

    const rows = POLICY_TYPES.map((t) => {
      const p = policies[t.key]
      const row = { contractor_id: session.user.id, policy_type: t.key, ...p }
      t.limitFields.forEach((f) => {
        row[f.name] = p[f.name] ? Number(p[f.name]) : null
      })
      return row
    })

    const { error: policiesError } = await supabase.from('policies').insert(rows)

    if (policiesError) {
      setStatus('error')
      setErrorMsg(policiesError.message)
      return
    }

    await refreshProfile()
    navigate('/contractor')
  }

  return (
    <div className="screen">
      <AppHeader />
      <h1>Set up your account</h1>
      <p className="muted">Enter this once — every future COI request pulls from here.</p>

      <form onSubmit={handleSubmit}>
        <Card>
          <h2>Business info</h2>
          <div className="field-group">
            <label htmlFor="business_name">Business name</label>
            <input
              id="business_name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="contact_name">Contact name</label>
            <input
              id="contact_name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label htmlFor="phone">Phone</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
        </Card>

        <div className="section-spacer" />

        {POLICY_TYPES.map((type) => (
          <div key={type.key}>
            <Card>
              <h2>{type.label}</h2>

              <div className="field-row">
                <div className="field-group">
                  <label htmlFor={`${type.key}_carrier`}>Carrier</label>
                  <input
                    id={`${type.key}_carrier`}
                    value={policies[type.key].carrier_name}
                    onChange={(e) => updatePolicyField(type.key, 'carrier_name', e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor={`${type.key}_naic`}>NAIC #</label>
                  <input
                    id={`${type.key}_naic`}
                    value={policies[type.key].naic_number}
                    onChange={(e) => updatePolicyField(type.key, 'naic_number', e.target.value)}
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor={`${type.key}_policy_number`}>Policy number</label>
                <input
                  id={`${type.key}_policy_number`}
                  value={policies[type.key].policy_number}
                  onChange={(e) => updatePolicyField(type.key, 'policy_number', e.target.value)}
                  required
                />
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label htmlFor={`${type.key}_effective`}>Effective date</label>
                  <input
                    id={`${type.key}_effective`}
                    type="date"
                    value={policies[type.key].effective_date}
                    onChange={(e) => updatePolicyField(type.key, 'effective_date', e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor={`${type.key}_expiration`}>Expiration date</label>
                  <input
                    id={`${type.key}_expiration`}
                    type="date"
                    value={policies[type.key].expiration_date}
                    onChange={(e) => updatePolicyField(type.key, 'expiration_date', e.target.value)}
                    required
                  />
                </div>
              </div>

              {type.limitFields.map((f) => (
                <div className="field-group" key={f.name}>
                  <label htmlFor={`${type.key}_${f.name}`}>{f.label}</label>
                  <input
                    id={`${type.key}_${f.name}`}
                    type="number"
                    inputMode="numeric"
                    placeholder="$"
                    value={policies[type.key][f.name] || ''}
                    onChange={(e) => updatePolicyField(type.key, f.name, e.target.value)}
                    required
                  />
                </div>
              ))}

              {type.hasEndorsements && (
                <>
                  <div className="checkbox-row">
                    <input
                      id={`${type.key}_ai`}
                      type="checkbox"
                      checked={policies[type.key].additional_insured}
                      onChange={(e) => updatePolicyField(type.key, 'additional_insured', e.target.checked)}
                    />
                    <label htmlFor={`${type.key}_ai`}>Additional insured available</label>
                  </div>
                  <div className="checkbox-row">
                    <input
                      id={`${type.key}_wos`}
                      type="checkbox"
                      checked={policies[type.key].waiver_of_subrogation}
                      onChange={(e) => updatePolicyField(type.key, 'waiver_of_subrogation', e.target.checked)}
                    />
                    <label htmlFor={`${type.key}_wos`}>Waiver of subrogation available</label>
                  </div>
                  <div className="checkbox-row">
                    <input
                      id={`${type.key}_pnc`}
                      type="checkbox"
                      checked={policies[type.key].primary_noncontributory}
                      onChange={(e) => updatePolicyField(type.key, 'primary_noncontributory', e.target.checked)}
                    />
                    <label htmlFor={`${type.key}_pnc`}>Primary &amp; noncontributory available</label>
                  </div>
                </>
              )}
            </Card>
            <div className="section-spacer" />
          </div>
        ))}

        <Button type="submit" variant="gold" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : 'Save & continue'}
        </Button>
        {status === 'error' && (
          <p style={{ color: 'var(--color-error)', marginTop: 12 }}>{errorMsg}</p>
        )}
      </form>
    </div>
  )
}

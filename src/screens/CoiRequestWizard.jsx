import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import AppHeader from '../components/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STEP_COUNT = 4

export default function CoiRequestWizard() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [savedHolders, setSavedHolders] = useState([])
  const [selectedHolderId, setSelectedHolderId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)

  const [holderName, setHolderName] = useState('')
  const [holderAddress, setHolderAddress] = useState('')
  const [holderCity, setHolderCity] = useState('')
  const [holderState, setHolderState] = useState('')
  const [holderZip, setHolderZip] = useState('')

  const [description, setDescription] = useState('')
  const [hasExceptions, setHasExceptions] = useState(null) // null | true | false
  const [exceptionDetails, setExceptionDetails] = useState('')

  const [status, setStatus] = useState('idle') // idle | submitting | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase
      .from('certificate_holders')
      .select('*')
      .eq('contractor_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSavedHolders(data)
        if (!data || data.length === 0) setAddingNew(true)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectHolder(holder) {
    setSelectedHolderId(holder.id)
    setAddingNew(false)
    setHolderName(holder.holder_name)
    setHolderAddress(holder.holder_address || '')
    setHolderCity(holder.holder_city || '')
    setHolderState(holder.holder_state || '')
    setHolderZip(holder.holder_zip || '')
  }

  function startNewHolder() {
    setSelectedHolderId(null)
    setAddingNew(true)
    setHolderName('')
    setHolderAddress('')
    setHolderCity('')
    setHolderState('')
    setHolderZip('')
  }

  function canAdvanceFromStep1() {
    return holderName.trim() && holderAddress.trim() && holderCity.trim() && holderState.trim() && holderZip.trim()
  }

  async function handleSubmit() {
    setStatus('submitting')
    setErrorMsg('')

    let certificateHolderId = selectedHolderId

    if (addingNew) {
      const { data: newHolder, error: holderError } = await supabase
        .from('certificate_holders')
        .insert({
          contractor_id: session.user.id,
          holder_name: holderName,
          holder_address: holderAddress,
          holder_city: holderCity,
          holder_state: holderState,
          holder_zip: holderZip,
        })
        .select()
        .single()

      if (holderError) {
        setStatus('error')
        setErrorMsg(holderError.message)
        return
      }
      certificateHolderId = newHolder.id
    }

    const { data: newRequest, error: requestError } = await supabase
      .from('coi_requests')
      .insert({
        contractor_id: session.user.id,
        agent_id: profile.agent_id,
        certificate_holder_id: certificateHolderId,
        certificate_holder_name: holderName,
        certificate_holder_address: `${holderAddress}, ${holderCity}, ${holderState} ${holderZip}`,
        description_of_operations: description,
        has_exceptions: hasExceptions === true,
        exception_details: hasExceptions ? exceptionDetails : null,
        status: hasExceptions ? 'flagged' : 'ready_for_review',
      })
      .select()
      .single()

    if (requestError) {
      setStatus('error')
      setErrorMsg(requestError.message)
      return
    }

    // Best-effort: the request is already saved even if PDF generation hiccups.
    try {
      await fetch('/api/generate-coi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ requestId: newRequest.id }),
      })
    } catch {
      // The agent's queue can still pick this up; PDF generation can be retried later.
    }

    navigate('/contractor')
  }

  return (
    <div className="screen">
      <AppHeader />
      <h1>Request a COI</h1>
      <div className="step-indicator">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`dot ${n <= step ? 'active' : ''}`} />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <h2>Certificate holder</h2>
          {savedHolders.length > 0 && !addingNew && (
            <>
              <p className="muted">Pick a saved holder, or add a new one.</p>
              {savedHolders.map((h) => (
                <Card
                  key={h.id}
                  onClick={() => selectHolder(h)}
                  style={{
                    marginBottom: 12,
                    cursor: 'pointer',
                    border: selectedHolderId === h.id ? '2px solid var(--color-navy)' : undefined,
                  }}
                >
                  <strong>{h.holder_name}</strong>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {h.holder_address}, {h.holder_city}, {h.holder_state} {h.holder_zip}
                  </p>
                </Card>
              ))}
              <Button variant="secondary" onClick={startNewHolder}>
                + Add a new holder
              </Button>
            </>
          )}

          {addingNew && (
            <>
              {savedHolders.length > 0 && (
                <Button variant="secondary" onClick={() => setAddingNew(false)}>
                  ← Use a saved holder
                </Button>
              )}
              <div className="section-spacer" />
              <div className="field-group">
                <label htmlFor="holder_name">Holder name</label>
                <input id="holder_name" value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
              </div>
              <div className="field-group">
                <label htmlFor="holder_address">Street address</label>
                <input
                  id="holder_address"
                  value={holderAddress}
                  onChange={(e) => setHolderAddress(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="holder_city">City</label>
                <input id="holder_city" value={holderCity} onChange={(e) => setHolderCity(e.target.value)} required />
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label htmlFor="holder_state">State</label>
                  <input
                    id="holder_state"
                    value={holderState}
                    onChange={(e) => setHolderState(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="holder_zip">ZIP</label>
                  <input id="holder_zip" value={holderZip} onChange={(e) => setHolderZip(e.target.value)} required />
                </div>
              </div>
            </>
          )}

          <Button variant="primary" onClick={() => setStep(2)} disabled={!canAdvanceFromStep1()}>
            Continue
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2>Description of operations</h2>
          <p className="muted">What work is being done for this job?</p>
          <div className="field-group">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Roof replacement at the above job site"
            />
          </div>
          <Button variant="secondary" onClick={() => setStep(1)}>
            Back
          </Button>
          <div className="section-spacer" />
          <Button variant="primary" onClick={() => setStep(3)}>
            Continue
          </Button>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h2>Any exceptions?</h2>
          <p className="muted">
            Additional insured wording, waiver of subrogation, non-standard limits, or anything else outside your
            standard policy.
          </p>
          <div className="checkbox-row" style={{ marginBottom: 12 }}>
            <input
              id="exceptions_no"
              type="radio"
              name="exceptions"
              checked={hasExceptions === false}
              onChange={() => setHasExceptions(false)}
            />
            <label htmlFor="exceptions_no">No exceptions — standard COI</label>
          </div>
          <div className="checkbox-row">
            <input
              id="exceptions_yes"
              type="radio"
              name="exceptions"
              checked={hasExceptions === true}
              onChange={() => setHasExceptions(true)}
            />
            <label htmlFor="exceptions_yes">Yes, there are exceptions</label>
          </div>

          {hasExceptions === true && (
            <div className="field-group" style={{ marginTop: 16 }}>
              <label htmlFor="exception_details">Describe the exception(s)</label>
              <textarea
                id="exception_details"
                value={exceptionDetails}
                onChange={(e) => setExceptionDetails(e.target.value)}
                required
              />
            </div>
          )}

          <Button variant="secondary" onClick={() => setStep(2)}>
            Back
          </Button>
          <div className="section-spacer" />
          <Button
            variant="primary"
            onClick={() => setStep(4)}
            disabled={hasExceptions === null || (hasExceptions === true && !exceptionDetails.trim())}
          >
            Continue
          </Button>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <h2>Review &amp; submit</h2>
          <div className="review-row">
            <span className="muted">Certificate holder</span>
            <span>{holderName}</span>
          </div>
          <div className="review-row">
            <span className="muted">Address</span>
            <span style={{ textAlign: 'right' }}>
              {holderAddress}, {holderCity}, {holderState} {holderZip}
            </span>
          </div>
          <div className="review-row">
            <span className="muted">Operations</span>
            <span style={{ textAlign: 'right' }}>{description || '—'}</span>
          </div>
          <div className="review-row">
            <span className="muted">Exceptions</span>
            <span>{hasExceptions ? 'Yes' : 'No'}</span>
          </div>
          {hasExceptions && (
            <div className="review-row">
              <span className="muted">Details</span>
              <span style={{ textAlign: 'right' }}>{exceptionDetails}</span>
            </div>
          )}

          <div className="section-spacer" />
          <Button variant="secondary" onClick={() => setStep(3)}>
            Back
          </Button>
          <div className="section-spacer" />
          <Button variant="gold" onClick={handleSubmit} disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting...' : 'Submit request'}
          </Button>
          {status === 'error' && (
            <p style={{ color: 'var(--color-error)', marginTop: 12, marginBottom: 0 }}>{errorMsg}</p>
          )}
        </Card>
      )}
    </div>
  )
}

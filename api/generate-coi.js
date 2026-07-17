import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

function formatDate(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${m}/${d}/${y}`
}

function money(n) {
  if (n === null || n === undefined) return ''
  return Number(n).toLocaleString('en-US')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { requestId } = req.body || {}
  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required' })
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Confirm the caller is actually allowed to see this request (RLS-enforced,
  // using their own token) before doing anything with elevated privileges.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: authCheck, error: authError } = await callerClient
    .from('coi_requests')
    .select('id')
    .eq('id', requestId)
    .single()

  if (authError || !authCheck) {
    return res.status(403).json({ error: 'Not authorized for this request' })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: request, error: requestError } = await admin
    .from('coi_requests')
    .select('*, certificate_holders(*)')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    return res.status(404).json({ error: 'Request not found' })
  }

  const [{ data: contractor }, { data: agent }, { data: policies }] = await Promise.all([
    admin.from('profiles').select('*').eq('id', request.contractor_id).single(),
    admin.from('profiles').select('*').eq('id', request.agent_id).single(),
    admin.from('policies').select('*').eq('contractor_id', request.contractor_id),
  ])

  const policyByType = {}
  ;(policies || []).forEach((p) => {
    policyByType[p.policy_type] = p
  })

  const templatePath = path.join(process.cwd(), 'api', 'templates', 'acord-25.pdf')
  const templateBytes = fs.readFileSync(templatePath)
  const pdfDoc = await PDFDocument.load(templateBytes)
  const form = pdfDoc.getForm()

  function setText(fieldName, value) {
    if (value === undefined || value === null || value === '') return
    try {
      form.getTextField(fieldName).setText(String(value))
    } catch {
      // Field missing or wrong type on this template revision — skip rather than fail the whole generation
    }
  }

  function check(fieldName) {
    try {
      form.getCheckBox(fieldName).check()
    } catch {
      // ignore
    }
  }

  setText('Producer_FullName_A', agent?.business_name)
  setText('Producer_ContactPerson_FullName_A', agent?.contact_name)
  setText('Producer_ContactPerson_PhoneNumber_A', agent?.phone)

  setText('NamedInsured_FullName_A', contractor?.business_name)

  const holder = request.certificate_holders
  setText('CertificateHolder_FullName_A', request.certificate_holder_name)
  setText('CertificateHolder_MailingAddress_LineOne_A', holder?.holder_address)
  setText('CertificateHolder_MailingAddress_CityName_A', holder?.holder_city)
  setText('CertificateHolder_MailingAddress_StateOrProvinceCode_A', holder?.holder_state)
  setText('CertificateHolder_MailingAddress_PostalCode_A', holder?.holder_zip)

  setText('CertificateOfLiabilityInsurance_ACORDForm_RemarkText_A', request.description_of_operations)
  setText('Form_CompletionDate_A', formatDate(new Date().toISOString().slice(0, 10)))

  const gl = policyByType.general_liability
  if (gl) {
    check('GeneralLiability_CoverageIndicator_A')
    check('GeneralLiability_OccurrenceIndicator_A')
    setText('Insurer_FullName_A', gl.carrier_name)
    setText('Insurer_NAICCode_A', gl.naic_number)
    setText('GeneralLiability_InsurerLetterCode_A', 'A')
    setText('Policy_GeneralLiability_PolicyNumberIdentifier_A', gl.policy_number)
    setText('Policy_GeneralLiability_EffectiveDate_A', formatDate(gl.effective_date))
    setText('Policy_GeneralLiability_ExpirationDate_A', formatDate(gl.expiration_date))
    setText('GeneralLiability_EachOccurrence_LimitAmount_A', money(gl.each_occurrence_limit))
    setText('GeneralLiability_GeneralAggregate_LimitAmount_A', money(gl.general_aggregate_limit))
    setText(
      'GeneralLiability_ProductsAndCompletedOperations_AggregateLimitAmount_A',
      money(gl.products_completed_ops_limit)
    )
    setText('GeneralLiability_PersonalAndAdvertisingInjury_LimitAmount_A', money(gl.personal_injury_limit))
    if (gl.additional_insured) setText('CertificateOfInsurance_GeneralLiability_AdditionalInsuredCode_A', 'X')
    if (gl.waiver_of_subrogation) setText('Policy_GeneralLiability_SubrogationWaivedCode_A', 'X')
  }

  const auto = policyByType.auto
  if (auto) {
    check('Vehicle_AnyAutoIndicator_A')
    setText('Insurer_FullName_B', auto.carrier_name)
    setText('Insurer_NAICCode_B', auto.naic_number)
    setText('Vehicle_InsurerLetterCode_A', 'B')
    setText('Policy_AutomobileLiability_PolicyNumberIdentifier_A', auto.policy_number)
    setText('Policy_AutomobileLiability_EffectiveDate_A', formatDate(auto.effective_date))
    setText('Policy_AutomobileLiability_ExpirationDate_A', formatDate(auto.expiration_date))
    setText('Vehicle_CombinedSingleLimit_EachAccidentAmount_A', money(auto.combined_single_limit))
  }

  const umbrella = policyByType.umbrella
  if (umbrella) {
    check('Policy_PolicyType_UmbrellaIndicator_A')
    check('ExcessUmbrella_OccurrenceIndicator_A')
    setText('Insurer_FullName_C', umbrella.carrier_name)
    setText('Insurer_NAICCode_C', umbrella.naic_number)
    setText('ExcessUmbrella_InsurerLetterCode_A', 'C')
    setText('Policy_ExcessLiability_PolicyNumberIdentifier_A', umbrella.policy_number)
    setText('Policy_ExcessLiability_EffectiveDate_A', formatDate(umbrella.effective_date))
    setText('Policy_ExcessLiability_ExpirationDate_A', formatDate(umbrella.expiration_date))
    setText('ExcessUmbrella_Umbrella_EachOccurrenceAmount_A', money(umbrella.umbrella_each_occurrence))
    setText('ExcessUmbrella_Umbrella_AggregateAmount_A', money(umbrella.umbrella_aggregate))
  }

  const wc = policyByType.workers_comp
  if (wc) {
    check('WorkersCompensationEmployersLiability_WorkersCompensationStatutoryLimitIndicator_A')
    setText('Insurer_FullName_D', wc.carrier_name)
    setText('Insurer_NAICCode_D', wc.naic_number)
    setText('WorkersCompensationEmployersLiability_InsurerLetterCode_A', 'D')
    setText('Policy_WorkersCompensationAndEmployersLiability_PolicyNumberIdentifier_A', wc.policy_number)
    setText('Policy_WorkersCompensationAndEmployersLiability_EffectiveDate_A', formatDate(wc.effective_date))
    setText('Policy_WorkersCompensationAndEmployersLiability_ExpirationDate_A', formatDate(wc.expiration_date))
    setText(
      'WorkersCompensationEmployersLiability_EmployersLiability_EachAccidentLimitAmount_A',
      money(wc.wc_each_accident)
    )
    setText(
      'WorkersCompensationEmployersLiability_EmployersLiability_DiseaseEachEmployeeLimitAmount_A',
      money(wc.wc_disease_each_employee)
    )
    setText(
      'WorkersCompensationEmployersLiability_EmployersLiability_DiseasePolicyLimitAmount_A',
      money(wc.wc_disease_policy_limit)
    )
  }

  const pdfBytes = await pdfDoc.save()

  const fileName = `${request.contractor_id}/${request.id}.pdf`
  const { error: uploadError } = await admin.storage
    .from('coi-documents')
    .upload(fileName, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    return res.status(500).json({ error: uploadError.message })
  }

  const { data: signedUrlData, error: signedUrlError } = await admin.storage
    .from('coi-documents')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365)

  if (signedUrlError) {
    return res.status(500).json({ error: signedUrlError.message })
  }

  const newStatus = request.has_exceptions ? 'flagged' : 'ready_for_review'

  const { error: updateError } = await admin
    .from('coi_requests')
    .update({ pdf_url: signedUrlData.signedUrl, status: newStatus })
    .eq('id', requestId)

  if (updateError) {
    return res.status(500).json({ error: updateError.message })
  }

  return res.status(200).json({ success: true, pdfUrl: signedUrlData.signedUrl })
}

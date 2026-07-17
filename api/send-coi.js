import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { requestId, recipientEmail } = req.body || {}
  if (!requestId || !recipientEmail) {
    return res.status(400).json({ error: 'requestId and recipientEmail are required' })
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  // Confirm the caller is the agent assigned to this request (RLS-enforced,
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

  if (!resendKey) {
    return res.status(500).json({ error: 'Email sending is disabled (no RESEND_API_KEY configured)' })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: request, error: requestError } = await admin
    .from('coi_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    return res.status(404).json({ error: 'Request not found' })
  }

  if (!request.pdf_url) {
    return res.status(400).json({ error: 'No PDF has been generated for this request yet' })
  }

  const fileName = `${request.contractor_id}/${request.id}.pdf`
  const { data: fileBlob, error: downloadError } = await admin.storage.from('coi-documents').download(fileName)

  if (downloadError) {
    return res.status(500).json({ error: downloadError.message })
  }

  const arrayBuffer = await fileBlob.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  const { data: contractorAuth } = await admin.auth.admin.getUserById(request.contractor_id)
  const contractorEmail = contractorAuth?.user?.email

  const recipients = [recipientEmail]
  if (contractorEmail && contractorEmail !== recipientEmail) recipients.push(contractorEmail)

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'RapidCOI <onboarding@resend.dev>',
      to: recipients,
      subject: `Certificate of Insurance - ${request.certificate_holder_name}`,
      html: `<p>Attached is the Certificate of Insurance for <strong>${request.certificate_holder_name}</strong>.</p>`,
      attachments: [{ filename: 'certificate-of-insurance.pdf', content: base64 }],
    }),
  })

  if (!emailResponse.ok) {
    const errBody = await emailResponse.text()
    return res.status(500).json({ error: `Resend error: ${errBody}` })
  }

  const { error: updateError } = await admin
    .from('coi_requests')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: request.agent_id })
    .eq('id', requestId)

  if (updateError) {
    return res.status(500).json({ error: updateError.message })
  }

  return res.status(200).json({ success: true })
}

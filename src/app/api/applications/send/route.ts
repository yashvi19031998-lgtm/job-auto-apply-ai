import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSmtpTransporter, getSmtpFromEmail, getSmtpFromName } from '@/lib/email/smtp'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transporter = getSmtpTransporter()
    if (!transporter) {
      return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 400 })
    }

    const { applicationId } = await request.json()
    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    }

    // Fetch Application
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('*, job:jobs(id, status, match_score, email, application_url)')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single()

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 404 })
    }

    if (app.status === 'sent') {
      return NextResponse.json({ error: 'This application has already been sent.' }, { status: 400 })
    }

    if (app.status !== 'Pending' && app.status !== 'Failed' && app.status !== 'pending' && app.status !== 'failed') {
      return NextResponse.json({ error: 'Invalid application status for sending.' }, { status: 400 })
    }

    // Verify Job Status & Match Score (threshold logic should have made it eligible initially, but we double check status)
    const job = app.job as unknown as Record<string, unknown>
    if (!job || job.status !== 'eligible') {
      return NextResponse.json({ error: 'Job is no longer eligible for application.' }, { status: 400 })
    }

    if (!app.email_to) {
      return NextResponse.json({ error: 'This job does not have an application email.' }, { status: 400 })
    }

    // Fetch Active Resume
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('file_path, file_name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (resumeError || !resume || !resume.file_path) {
      return NextResponse.json({ error: 'Active resume not found.' }, { status: 400 })
    }

    // Download PDF securely from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(resume.file_path)

    if (downloadError || !fileData) {
      console.error('Download Error:', downloadError)
      return NextResponse.json({ error: 'Failed to retrieve resume PDF for attachment.' }, { status: 500 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Send Email
    const fromStr = `"${getSmtpFromName()}" <${getSmtpFromEmail()}>`
    
    try {
      await transporter.sendMail({
        from: fromStr,
        to: app.email_to,
        subject: app.email_subject,
        text: app.email_body,
        attachments: [
          {
            filename: resume.file_name || 'Resume.pdf',
            content: buffer,
            contentType: 'application/pdf'
          }
        ]
      })
    } catch (smtpErr) {
      console.error('SMTP Send Error:', smtpErr)
      await supabase
        .from('applications')
        .update({ status: 'Failed', updated_at: new Date().toISOString() })
        .eq('id', app.id)
      return NextResponse.json({ error: 'Unable to send the application. Please try again.' }, { status: 500 })
    }

    // Update status to sent
    await supabase
      .from('applications')
      .update({ 
        status: 'Sent', 
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', app.id)
      
    // Update Job status to applied
    await supabase
      .from('jobs')
      .update({ status: 'applied', updated_at: new Date().toISOString() })
      .eq('id', job.id as string)

    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    console.error('Send Application Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred during email sending.' }, { status: 500 })
  }
}

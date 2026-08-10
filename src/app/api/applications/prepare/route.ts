import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId, subject, body, emailTo } = await request.json()
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Check duplicate first
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (existingApp) {
      return NextResponse.json({ error: 'Duplicate application already exists.' }, { status: 409 })
    }

    // Verify Job Ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, email')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or unauthorized' }, { status: 404 })
    }

    if (job.status !== 'eligible') {
      return NextResponse.json({ error: 'Job is not eligible for application.' }, { status: 400 })
    }

    // Insert Application
    const finalEmailTo = emailTo || job.email || ''
    const finalSubject = subject || 'Job Application'
    const finalBody = body || ''

    const { error: insertError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: jobId,
        status: 'Pending',
        email_to: finalEmailTo,
        email_subject: finalSubject,
        email_body: finalBody
      })

    if (insertError) {
      console.error('Insert Error:', insertError)
      return NextResponse.json({ error: 'Failed to save application record.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    console.error('Prepare Application Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

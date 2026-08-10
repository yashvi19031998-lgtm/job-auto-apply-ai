import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApplicationEmail } from '@/lib/jobs/email-generator'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await request.json()
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Fetch Job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or unauthorized' }, { status: 404 })
    }

    // Fetch Active Resume
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (resumeError || !resume) {
      return NextResponse.json({ error: 'No active resume found.' }, { status: 400 })
    }

    // Fetch Profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Fetch Settings
    let { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!profile || !settings) {
      // Lazy create using admin client if trigger failed
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminAuth = createAdminClient()
      
      if (!profile) {
        await adminAuth.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'User'
        })
        const res = await supabase.from('profiles').select('*').eq('id', user.id).single()
        profile = res.data
      }
      
      if (!settings) {
        await adminAuth.from('settings').insert({
          user_id: user.id
        })
        const res = await supabase.from('settings').select('*').eq('user_id', user.id).single()
        settings = res.data
      }
    }

    if (!profile || !settings) {
      return NextResponse.json({ error: 'User profile or settings missing and could not be created automatically.' }, { status: 400 })
    }

    // Verify Eligibility
    if (job.status !== 'eligible') {
      return NextResponse.json({ error: 'Job is not marked as eligible for application.' }, { status: 400 })
    }

    if (!job.email && !job.application_url) {
      return NextResponse.json({ error: 'Application contact unavailable.' }, { status: 400 })
    }

    // Check duplicate
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (existingApp) {
      return NextResponse.json({ error: 'Duplicate' }, { status: 409 })
    }

    // Generate email
    const emailDraft = generateApplicationEmail(job, resume, profile, settings)

    return NextResponse.json({ success: true, email: emailDraft })

  } catch (err: unknown) {
    console.error('Email Generation Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred during email generation.' }, { status: 500 })
  }
}

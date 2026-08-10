import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchJob } from '@/lib/jobs/matcher'

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
      return NextResponse.json({ error: 'No active resume found. Please upload and analyze a resume first.' }, { status: 400 })
    }

    // Fetch Settings
    const { data: settings } = await supabase
      .from('settings')
      .select('minimum_match_score')
      .eq('user_id', user.id)
      .single()

    const minScore = settings?.minimum_match_score ?? 50

    // Match Engine
    const result = matchJob(job, resume)
    
    // Status Logic
    const status = result.score >= minScore ? 'eligible' : 'skipped'

    // Update Job
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        match_score: result.score,
        match_reason: result.reason,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    if (updateError) {
      throw new Error('Failed to update job match status')
    }

    return NextResponse.json({ success: true, result, status })

  } catch (err: unknown) {
    console.error('Job Match Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred during matching.' }, { status: 500 })
  }
}

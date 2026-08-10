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

    // Fetch all pending jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (jobsError) {
      return NextResponse.json({ error: 'Failed to fetch pending jobs' }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, result: { total: 0, eligible: 0, skipped: 0 } })
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

    let eligibleCount = 0
    let skippedCount = 0

    // Match Engine logic iteratively
    for (const job of jobs) {
      const result = matchJob(job, resume)
      const status = result.score >= minScore ? 'eligible' : 'skipped'

      if (status === 'eligible') eligibleCount++
      else skippedCount++

      await supabase
        .from('jobs')
        .update({
          match_score: result.score,
          match_reason: result.reason,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
    }

    return NextResponse.json({ 
      success: true, 
      result: { 
        total: jobs.length, 
        eligible: eligibleCount, 
        skipped: skippedCount 
      } 
    })

  } catch (err: unknown) {
    console.error('Job Match-All Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred during bulk matching.' }, { status: 500 })
  }
}

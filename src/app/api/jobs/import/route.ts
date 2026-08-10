import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExtractedJob } from '@/types/job'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { batchName, jobs } = body

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: 'No jobs provided' }, { status: 400 })
    }

    const validBatchName = batchName || `Import - ${new Date().toLocaleDateString()}`

    // 1. Fetch existing jobs for duplicate detection
    const { data: existingJobs, error: existingError } = await supabase
      .from('jobs')
      .select('company_name, job_title, email, application_url')
      .eq('user_id', user.id)

    if (existingError) {
      throw new Error('Failed to fetch existing jobs for deduplication')
    }

    const existingSet = new Set(
      (existingJobs || []).map(j => {
        return `${(j.company_name || '').toLowerCase().trim()}|${(j.job_title || '').toLowerCase().trim()}|${(j.email || '').toLowerCase().trim()}|${(j.application_url || '').toLowerCase().trim()}`
      })
    )

    let duplicates = 0
    const jobsToInsert = []

    for (const job of jobs as ExtractedJob[]) {
      const key = `${(job.company_name || '').toLowerCase().trim()}|${(job.job_title || '').toLowerCase().trim()}|${(job.email || '').toLowerCase().trim()}|${(job.application_url || '').toLowerCase().trim()}`
      
      if (existingSet.has(key)) {
        duplicates++
      } else {
        jobsToInsert.push(job)
        // Add to set to prevent duplicates within the same batch
        existingSet.add(key)
      }
    }

    if (jobsToInsert.length === 0) {
      return NextResponse.json({ 
        success: true, 
        result: { jobs_found: jobs.length, jobs_saved: 0, duplicates, skipped: 0 } 
      })
    }

    // 2. Create batch
    const { data: batch, error: batchError } = await supabase
      .from('job_batches')
      .insert({
        user_id: user.id,
        batch_name: validBatchName,
        raw_chat: 'Extracted via UI', // We don't store full raw chat from the client for this specific payload to save bandwidth, unless passed.
        jobs_found: jobsToInsert.length,
      })
      .select()
      .single()

    if (batchError || !batch) {
      throw new Error('Failed to create job batch: ' + batchError?.message)
    }

    // 3. Insert Jobs
    const { error: insertError } = await supabase
      .from('jobs')
      .insert(
        jobsToInsert.map(job => ({
          user_id: user.id,
          batch_id: batch.id,
          company_name: job.company_name,
          job_title: job.job_title,
          job_description: job.job_description,
          experience_min: job.experience_min,
          experience_max: job.experience_max,
          location: job.location,
          email: job.email,
          application_url: job.application_url,
          required_skills: job.required_skills || [],
          status: 'pending',
        }))
      )

    if (insertError) {
      // rollback batch?
      console.error('Insert jobs error:', insertError)
      throw new Error('Failed to insert jobs')
    }

    return NextResponse.json({ 
      success: true, 
      result: { 
        jobs_found: jobs.length, 
        jobs_saved: jobsToInsert.length, 
        duplicates, 
        skipped: 0 
      } 
    })

  } catch (err) {
    console.error('Job Import Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred during import.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractJobsFromChat } from '@/lib/jobs/extractor'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const rawChat = body?.rawChat

    if (!rawChat || typeof rawChat !== 'string' || rawChat.trim().length === 0) {
      return NextResponse.json({ error: 'Raw chat content is required' }, { status: 400 })
    }

    if (rawChat.length > 500000) {
      return NextResponse.json({ error: 'Payload too large. Please paste a smaller chunk.' }, { status: 413 })
    }

    const jobs = extractJobsFromChat(rawChat)

    return NextResponse.json({ success: true, jobs })
  } catch (err) {
    console.error('Job Extraction Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred during extraction.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Resume ID is required' }, { status: 400 })
    }

    // First, verify the resume belongs to the user
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !resume) {
      return NextResponse.json({ error: 'Resume not found or unauthorized' }, { status: 404 })
    }

    // Set all other resumes to inactive
    await supabase
      .from('resumes')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Set target resume to active
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ is_active: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to set active resume:', updateError)
      return NextResponse.json({ error: 'Failed to set active resume' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Unexpected error setting active resume:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

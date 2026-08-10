import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Resume ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership and get file_path
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('file_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !resume || !resume.file_path) {
      return NextResponse.json({ error: 'Resume not found or unauthorized' }, { status: 404 })
    }

    // Create a signed URL valid for 60 seconds
    const { data, error: signedUrlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(resume.file_path, 60, {
        download: true,
      })

    if (signedUrlError || !data?.signedUrl) {
      console.error('Failed to generate signed URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl)

  } catch (err) {
    console.error('Unexpected error generating download URL:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

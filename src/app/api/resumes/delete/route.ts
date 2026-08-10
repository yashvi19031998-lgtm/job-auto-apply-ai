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

    // Verify ownership and get file_path
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !resume) {
      return NextResponse.json({ error: 'Resume not found or unauthorized' }, { status: 404 })
    }

    // Delete from storage
    if (resume.file_path) {
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([resume.file_path])
      
      if (storageError) {
        console.error('Failed to delete file from storage:', storageError)
        // Decide whether to fail or continue if storage deletion fails. We will continue.
      }
    }

    // Delete from DB
    const { error: deleteError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to delete resume record:', deleteError)
      return NextResponse.json({ error: 'Failed to delete resume record' }, { status: 500 })
    }

    // If it was active, try to set another one as active
    if (resume.is_active) {
      const { data: otherResumes } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        
      if (otherResumes && otherResumes.length > 0) {
        await supabase
          .from('resumes')
          .update({ is_active: true })
          .eq('id', otherResumes[0].id)
      }
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Unexpected error deleting resume:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

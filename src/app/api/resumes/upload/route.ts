import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type. Only PDF is allowed.' }, { status: 400 })
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const uniqueFileName = `${uuidv4()}.${fileExt}`
    const filePath = `${user.id}/${uniqueFileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file to storage.' }, { status: 500 })
    }

    // Check existing resumes
    const { data: existingResumes, error: fetchError } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', user.id)

    if (fetchError) {
      console.error('Database fetch error:', fetchError)
      // We don't abort here, we can still try to insert
    }

    const isFirstResume = !existingResumes || existingResumes.length === 0

    // Insert DB record
    const { data: resumeRecord, error: insertError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        is_active: isFirstResume
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      // Cleanup storage if DB fails
      await supabase.storage.from('resumes').remove([filePath])
      return NextResponse.json({ error: 'Failed to save resume record.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, resume: resumeRecord })

  } catch (err) {
    console.error('Unexpected upload error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

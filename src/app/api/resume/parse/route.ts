import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePdfToText } from '@/lib/resume/parser'
import { generateMockProfile } from '@/lib/resume/mock-profile'
import { Json } from '@/types/database'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const resumeId = body?.resumeId

    if (!resumeId) {
      return NextResponse.json({ error: 'Resume ID is required' }, { status: 400 })
    }

    // 1. Fetch resume record
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('file_path')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !resume) {
      return NextResponse.json({ error: 'Resume not found or unauthorized' }, { status: 404 })
    }

    // 2. Download from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(resume.file_path)

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download PDF from storage' }, { status: 500 })
    }

    // 3. Extract text
    const buffer = Buffer.from(await fileData.arrayBuffer())
    let extractedText = ''
    try {
      const { text } = await parsePdfToText(buffer)
      extractedText = text
    } catch (parseError) {
      console.error('PDF Parse Error:', parseError)
      return NextResponse.json({ error: 'Could not extract readable text from this PDF. Please upload a text-based PDF resume.' }, { status: 400 })
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract readable text from this PDF. Please upload a text-based PDF resume.' }, { status: 400 })
    }

    // 4. Generate mock profile
    const profile = await generateMockProfile(extractedText)

    // 5. Update database
    const { error: updateError } = await supabase
      .from('resumes')
      .update({
        extracted_text: extractedText,
        skills: profile.skills,
        experience: profile.experience as unknown as Json,
        education: profile.education as unknown as Json,
        updated_at: new Date().toISOString()
      })
      .eq('id', resumeId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('DB Update Error:', updateError)
      return NextResponse.json({ error: 'Failed to save extracted profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile })

  } catch (err) {
    console.error('Unexpected parse error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred during parsing.' }, { status: 500 })
  }
}

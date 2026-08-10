import { createClient } from '@/lib/supabase/server'
import { ResumeClient } from '@/components/resume/ResumeClient'
import { Database } from '@/types/database'

export default async function ResumePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // We can assume user is defined because of middleware, but TypeScript might not know.
  let resumes: Database['public']['Tables']['resumes']['Row'][] = []
  if (user) {
    const { data } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      
    resumes = data || []
  }

  return (
    <div className="max-w-4xl">
      <ResumeClient initialResumes={resumes} />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { JobsClient } from '@/components/jobs/JobsClient'
import { redirect } from 'next/navigation'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <JobsClient initialJobs={jobs || []} />
}

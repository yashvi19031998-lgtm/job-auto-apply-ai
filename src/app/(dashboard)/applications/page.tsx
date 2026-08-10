import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApplicationsClient, EnrichedApplication } from '@/components/applications/ApplicationsClient'

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: applications } = await supabase
    .from('applications')
    .select(`
      *,
      job:jobs (
        job_title,
        company_name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <ApplicationsClient initialApplications={(applications || []) as unknown as EnrichedApplication[]} />
}

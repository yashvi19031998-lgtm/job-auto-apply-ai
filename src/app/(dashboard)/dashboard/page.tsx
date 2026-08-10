import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MatchScoreBadge } from '@/components/ui/MatchScoreBadge';
import { Button } from '@/components/ui/Button';
import { Briefcase, FileCheck, Send, Percent, FileText } from 'lucide-react';
import Link from 'next/link';
import { getActiveResume } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const activeResume = await getActiveResume();

  // Fetch Jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const jobsData = jobs || []
  
  // Stats
  const jobsFound = jobsData.length
  
  // Assuming eligible + any applications sent originated as eligible
  const matchedJobs = jobsData.filter(j => j.status === 'eligible' || j.status === 'applied').length
  
  // Calculate average match
  const scoredJobs = jobsData.filter(j => j.match_score !== null)
  const averageMatch = scoredJobs.length > 0 
    ? Math.round(scoredJobs.reduce((acc, curr) => acc + (curr.match_score || 0), 0) / scoredJobs.length)
    : 0

  // Fetch Applications count
  const { count: applicationsCount } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const recentJobs = jobsData.slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Good morning 👋</h1>
          <p className="mt-1 text-gray-500">Manage your job applications with AI.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeResume ? (
            <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium">
              <FileText className="h-4 w-4" />
              {activeResume.file_name}
            </div>
          ) : (
            <Link href="/resume">
              <Button variant="outline" size="sm">Upload Resume</Button>
            </Link>
          )}
          <Link href="/jobs/process">
            <Button>Process New Jobs</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Jobs Found" value={jobsFound} icon={Briefcase} />
        <StatCard title="Matched Jobs" value={matchedJobs} icon={FileCheck} />
        <StatCard title="Applications Prepared" value={applicationsCount || 0} icon={Send} />
        <StatCard title="Average Match" value={`${averageMatch}%`} icon={Percent} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    No recent jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                recentJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.job_title || 'Unknown'}</TableCell>
                    <TableCell>{job.company_name || 'Unknown'}</TableCell>
                    <TableCell>{job.location || 'Unknown'}</TableCell>
                    <TableCell>
                      {job.match_score !== null ? <MatchScoreBadge score={job.match_score} /> : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={(job.status.charAt(0).toUpperCase() + job.status.slice(1)) as 'Sent' | 'Pending' | 'Failed' | 'Skipped' | 'Duplicate'} />
                    </TableCell>
                    <TableCell className="text-gray-500">{new Date(job.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

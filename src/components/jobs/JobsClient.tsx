'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Play, Info, Mail } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/types/database'
import { MatchScoreBadge } from '@/components/ui/MatchScoreBadge'
import { useRouter } from 'next/navigation'

type Job = Database['public']['Tables']['jobs']['Row']

export function JobsClient({ initialJobs }: { initialJobs: Job[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [isMatchingAll, setIsMatchingAll] = useState(false)
  const [matchingJobId, setMatchingJobId] = useState<string | null>(null)
  
  // Expanded job state
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)

  const filteredJobs = initialJobs.filter(job => {
    const searchMatch = (
      (job.job_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    const statusMatch = statusFilter === 'All Status' || job.status.toLowerCase() === statusFilter.toLowerCase()
    
    return searchMatch && statusMatch
  })

  const handleMatchAll = async () => {
    setIsMatchingAll(true)
    try {
      const res = await fetch('/api/jobs/match-all', { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to match all jobs')
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during matching.')
    } finally {
      setIsMatchingAll(false)
    }
  }

  const handleMatchJob = async (jobId: string) => {
    setMatchingJobId(jobId)
    try {
      const res = await fetch('/api/jobs/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      })
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to match job')
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during matching.')
    } finally {
      setMatchingJobId(null)
    }
  }

  const handlePrepareApplication = async (jobId: string) => {
    try {
      const res = await fetch('/api/applications/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to generate email')
        return
      }

      // Automatically save it
      const prepRes = await fetch('/api/applications/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          subject: data.email.subject,
          body: data.email.body,
          emailTo: data.email.emailTo
        })
      })

      const prepData = await prepRes.json()
      if (!prepRes.ok) {
        alert(prepData.error || 'Failed to prepare application')
      } else {
        alert('Application prepared successfully! You can view it in the Applications tab.')
        router.push('/applications')
      }

    } catch (err) {
      console.error(err)
      alert('An error occurred during application preparation.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>
          <p className="text-gray-500">Review jobs extracted from your job sources.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleMatchAll} disabled={isMatchingAll}>
            <Play className="h-4 w-4 mr-2" /> 
            {isMatchingAll ? 'Matching...' : 'Match All Jobs'}
          </Button>
          <Link href="/jobs/process">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Process New Jobs
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search jobs by title or company..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select className="w-full sm:w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Status</option>
            <option>Pending</option>
            <option>Eligible</option>
            <option>Skipped</option>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <React.Fragment key={job.id}>
                    <TableRow className={expandedJobId === job.id ? 'bg-gray-50' : ''}>
                      <TableCell className="font-medium text-gray-900">
                        {job.job_title || 'Unknown Title'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-gray-900">{job.company_name || 'Unknown Company'}</span>
                          <span className="text-xs text-gray-500">{job.location || 'Unknown Location'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.match_score !== null ? (
                          <MatchScoreBadge score={job.match_score} />
                        ) : (
                          <span className="text-xs text-gray-400">Not matched</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={(job.status.charAt(0).toUpperCase() + job.status.slice(1)) as 'Sent' | 'Pending' | 'Failed' | 'Skipped' | 'Duplicate'} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                          >
                            <Info className="h-4 w-4 mr-1" /> Details
                          </Button>
                          {job.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleMatchJob(job.id)}
                              disabled={matchingJobId === job.id}
                            >
                              {matchingJobId === job.id ? 'Matching...' : 'Match'}
                            </Button>
                          )}
                          {job.status === 'eligible' && (
                            <Button 
                              size="sm"
                              onClick={() => handlePrepareApplication(job.id)}
                            >
                              <Mail className="h-4 w-4 mr-1" /> Prepare Application
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedJobId === job.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={5} className="p-4 border-t-0">
                          <div className="grid md:grid-cols-2 gap-6 text-sm">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Job Details</h4>
                              <p className="text-gray-600 mb-1"><strong>Email:</strong> {job.email || 'N/A'}</p>
                              <p className="text-gray-600 mb-1"><strong>URL:</strong> {job.application_url || 'N/A'}</p>
                              <p className="text-gray-600 mb-1"><strong>Exp Required:</strong> {job.experience_min !== null ? `${job.experience_min}${job.experience_max ? `-${job.experience_max}` : '+'} years` : 'None specified'}</p>
                              <div className="mt-3">
                                <strong className="text-gray-600">Required Skills:</strong>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(job.required_skills || []).map(skill => (
                                     <span key={skill} className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                                       {skill}
                                     </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Match Analysis</h4>
                              {job.match_score !== null ? (
                                <p className="text-gray-600">{job.match_reason}</p>
                              ) : (
                                <p className="text-gray-500 italic">This job has not been matched against your resume yet. Click &quot;Match&quot; or &quot;Match All&quot; to run the analysis.</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

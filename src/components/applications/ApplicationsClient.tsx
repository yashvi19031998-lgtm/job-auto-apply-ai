'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Mail, Send, AlertCircle, Loader2 } from 'lucide-react'
import { Database } from '@/types/database'
import { useRouter } from 'next/navigation'

type ApplicationRow = Database['public']['Tables']['applications']['Row']
type JobRow = Database['public']['Tables']['jobs']['Row']

export type EnrichedApplication = ApplicationRow & { job: JobRow }

export function ApplicationsClient({ initialApplications }: { initialApplications: EnrichedApplication[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingApp, setViewingApp] = useState<EnrichedApplication | null>(null)
  
  // Sending state
  const [confirmingSendApp, setConfirmingSendApp] = useState<EnrichedApplication | null>(null)
  const [isSending, setIsSending] = useState(false)

  const filteredApps = initialApplications.filter(app => {
    const jobTitle = (app.job?.job_title || '').toLowerCase()
    const companyName = (app.job?.company_name || '').toLowerCase()
    return jobTitle.includes(searchTerm.toLowerCase()) || companyName.includes(searchTerm.toLowerCase())
  })

  // Basic Stats
  const total = initialApplications.length
  const sent = initialApplications.filter(a => a.status.toLowerCase() === 'sent').length
  const pending = initialApplications.filter(a => a.status.toLowerCase() === 'pending').length
  const failed = initialApplications.filter(a => a.status.toLowerCase() === 'failed').length

  const handleSend = async () => {
    if (!confirmingSendApp) return
    setIsSending(true)
    
    try {
      const res = await fetch('/api/applications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: confirmingSendApp.id })
      })
      const data = await res.json()
      
      if (!res.ok) {
        alert(data.error || 'Failed to send application.')
      } else {
        alert('Application sent successfully!')
        setConfirmingSendApp(null)
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      alert('An unexpected error occurred.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Applications</h1>
        <p className="text-gray-500">Track every job application sent through the platform.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Applications</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Sent</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{sent}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pending</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{pending}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{failed}</p>
        </div>
      </div>

      <div className="flex items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search applications..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No applications found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.job?.job_title || 'Unknown'}</TableCell>
                    <TableCell>{app.job?.company_name || 'Unknown'}</TableCell>
                    <TableCell className="text-gray-500 max-w-[150px] truncate" title={app.email_to}>{app.email_to || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={(app.status.charAt(0).toUpperCase() + app.status.slice(1)) as 'Sent' | 'Pending' | 'Failed' | 'Skipped' | 'Duplicate'} />
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {app.status.toLowerCase() === 'sent' && app.sent_at 
                        ? new Date(app.sent_at).toLocaleDateString()
                        : new Date(app.created_at).toLocaleDateString()
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <Button variant="ghost" size="sm" onClick={() => setViewingApp(app)}>
                          View Email
                        </Button>
                        
                        {app.status.toLowerCase() === 'pending' && (
                          <Button size="sm" onClick={() => setConfirmingSendApp(app)}>
                            <Send className="h-4 w-4 mr-1" /> Send Application
                          </Button>
                        )}
                        
                        {app.status.toLowerCase() === 'failed' && (
                          <Button variant="outline" size="sm" onClick={() => setConfirmingSendApp(app)}>
                            <AlertCircle className="h-4 w-4 mr-1" /> Retry
                          </Button>
                        )}
                        
                        {app.status.toLowerCase() === 'sent' && (
                          <span className="text-sm font-medium text-green-600 px-3 py-1 bg-green-50 rounded-md">
                            Sent
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal for Viewing Email */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Application Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setViewingApp(null)}>Close</Button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-md">
                <div><span className="font-semibold text-gray-700">Status: </span> {viewingApp.status}</div>
                <div><span className="font-semibold text-gray-700">Created: </span> {new Date(viewingApp.created_at).toLocaleString()}</div>
                <div><span className="font-semibold text-gray-700">Sent At: </span> {viewingApp.sent_at ? new Date(viewingApp.sent_at).toLocaleString() : 'N/A'}</div>
                <div><span className="font-semibold text-gray-700">Match Score: </span> {viewingApp.job?.match_score}%</div>
              </div>
              <hr />
              <div>
                <span className="font-semibold text-gray-700">To: </span>
                <span className="text-gray-900">{viewingApp.email_to}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Subject: </span>
                <span className="text-gray-900">{viewingApp.email_subject}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Attachment: </span>
                <span className="text-gray-500 italic">Your active resume PDF</span>
              </div>
              <div className="border rounded-md p-4 bg-white text-sm whitespace-pre-wrap text-gray-800">
                {viewingApp.email_body}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button variant="outline" onClick={() => setViewingApp(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Confirming Send */}
      {confirmingSendApp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Send this application?</h2>
            
            <div className="bg-gray-50 border rounded-md p-4 space-y-3 text-sm mb-6">
              <div>
                <span className="font-semibold text-gray-700">To: </span>
                <span className="text-gray-900">{confirmingSendApp.email_to}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Subject: </span>
                <span className="text-gray-900">{confirmingSendApp.email_subject}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Attachment: </span>
                <span className="text-blue-600 underline decoration-blue-200">Your active resume PDF</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              This will send a real email via your configured SMTP server. Ensure your resume and email content are correct.
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmingSendApp(null)} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={isSending}>
                {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : 'Send Application'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

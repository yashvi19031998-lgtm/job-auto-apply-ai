'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { ExtractedJob, JobImportResult } from '@/types/job'
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'

export function ProcessClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [rawChat, setRawChat] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [extractedJobs, setExtractedJobs] = useState<(ExtractedJob & { selected: boolean })[]>([])
  const [importResult, setImportResult] = useState<JobImportResult | null>(null)

  const handleExtract = async () => {
    if (!rawChat.trim()) return
    setIsExtracting(true)
    setError(null)

    try {
      const res = await fetch('/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawChat }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Extraction failed')
      }

      const jobs = (data.jobs || []).map((j: ExtractedJob) => ({ ...j, selected: true }))
      setExtractedJobs(jobs)
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSave = async () => {
    const selectedJobs = extractedJobs.filter(j => j.selected)
    if (selectedJobs.length === 0) {
      setError('Please select at least one job to save.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: `WhatsApp Jobs - ${new Date().toLocaleDateString()}`,
          jobs: selectedJobs
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setImportResult(data.result)
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSelect = (index: number) => {
    setExtractedJobs(prev => prev.map((j, i) => i === index ? { ...j, selected: !j.selected } : j))
  }

  const updateJobField = <T extends keyof ExtractedJob>(index: number, field: T, value: ExtractedJob[T]) => {
    setExtractedJobs(prev => prev.map((j, i) => i === index ? { ...j, [field]: value } : j))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/jobs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Jobs
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Process New Jobs</h1>
        <p className="text-gray-500">Paste your WhatsApp job alerts and extract job opportunities automatically.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Paste WhatsApp Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-96 p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono whitespace-pre-wrap"
              placeholder="Paste WhatsApp chat here...&#10;&#10;[10/08/2026, 8:12 AM] Rahul:&#10;Frontend Developer&#10;Company: ABC Technologies&#10;Experience: 2-4 years&#10;..."
              value={rawChat}
              onChange={(e) => setRawChat(e.target.value)}
            />
            <div className="text-sm text-gray-500 mt-2 text-right">
              {rawChat.length} characters
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setRawChat('')}>Clear</Button>
            <Button onClick={handleExtract} disabled={isExtracting || !rawChat.trim()}>
              {isExtracting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting...</> : 'Extract Jobs'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm sticky top-4 z-10">
            <div>
              <h3 className="font-semibold text-lg">Found {extractedJobs.length} Jobs</h3>
              <p className="text-sm text-gray-500">{extractedJobs.filter(j => j.selected).length} selected</p>
            </div>
            <div className="space-x-3">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isSaving}>Discard</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save Selected Jobs'}
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {extractedJobs.map((job, idx) => (
              <Card key={idx} className={job.selected ? 'border-blue-200 ring-1 ring-blue-200' : 'opacity-70 grayscale'}>
                <CardHeader className="pb-3 border-b bg-gray-50/50 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      checked={job.selected}
                      onChange={() => toggleSelect(idx)}
                    />
                    <div className="font-semibold text-gray-900">Job {idx + 1}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => {
                    const next = [...extractedJobs]
                    next.splice(idx, 1)
                    setExtractedJobs(next)
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-4 grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Job Title</label>
                      <input 
                        className="w-full border p-2 rounded text-sm" 
                        value={job.job_title || ''} 
                        onChange={(e) => updateJobField(idx, 'job_title', e.target.value)} 
                        placeholder="Unknown"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                      <input 
                        className="w-full border p-2 rounded text-sm" 
                        value={job.company_name || ''} 
                        onChange={(e) => updateJobField(idx, 'company_name', e.target.value)} 
                        placeholder="Unknown"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Min Exp (Yrs)</label>
                        <input 
                          type="number"
                          className="w-full border p-2 rounded text-sm" 
                          value={job.experience_min === null ? '' : job.experience_min} 
                          onChange={(e) => updateJobField(idx, 'experience_min', e.target.value ? parseInt(e.target.value) : null)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Max Exp (Yrs)</label>
                        <input 
                          type="number"
                          className="w-full border p-2 rounded text-sm" 
                          value={job.experience_max === null ? '' : job.experience_max} 
                          onChange={(e) => updateJobField(idx, 'experience_max', e.target.value ? parseInt(e.target.value) : null)} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                      <input 
                        className="w-full border p-2 rounded text-sm" 
                        value={job.location || ''} 
                        onChange={(e) => updateJobField(idx, 'location', e.target.value)} 
                        placeholder="Unknown"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                      <input 
                        className="w-full border p-2 rounded text-sm" 
                        value={job.email || ''} 
                        onChange={(e) => updateJobField(idx, 'email', e.target.value)} 
                        placeholder="No email found"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Application URL</label>
                      <input 
                        className="w-full border p-2 rounded text-sm" 
                        value={job.application_url || ''} 
                        onChange={(e) => updateJobField(idx, 'application_url', e.target.value)} 
                        placeholder="No URL found"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Skills (comma separated)</label>
                      <input 
                        className="w-full border p-2 rounded text-sm" 
                        value={job.required_skills.join(', ')} 
                        onChange={(e) => updateJobField(idx, 'required_skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                        placeholder="No skills found"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Source Text Preview</label>
                      <div className="w-full h-20 overflow-y-auto bg-gray-50 border p-2 rounded text-xs font-mono text-gray-600 whitespace-pre-wrap">
                        {job.source_text}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === 3 && importResult && (
        <Card className="max-w-2xl mx-auto text-center py-8">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 flex items-center justify-center rounded-full mb-4">
              <Save className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 flex justify-around text-sm border">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{importResult.jobs_found}</div>
                <div className="text-gray-500 mt-1">Jobs Found</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{importResult.jobs_saved}</div>
                <div className="text-gray-500 mt-1">Saved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{importResult.duplicates}</div>
                <div className="text-gray-500 mt-1">Duplicates</div>
              </div>
            </div>
            <p className="text-gray-600">
              Successfully imported {importResult.jobs_saved} new jobs to your list.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => {
              setRawChat('')
              setExtractedJobs([])
              setImportResult(null)
              setStep(1)
            }}>
              Process Another Chat
            </Button>
            <Link href="/jobs">
              <Button>View Jobs</Button>
            </Link>
          </CardFooter>
        </Card>
      )}

    </div>
  )
}

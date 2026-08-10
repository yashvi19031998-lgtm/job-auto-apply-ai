'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { FileText, Upload, CheckCircle2, Trash2, Download, Search, RefreshCw } from 'lucide-react'
import { Database } from '@/types/database'
import { ResumeProfile, ResumeExperience, ResumeEducation } from '@/types/resume'

type Resume = Database['public']['Tables']['resumes']['Row']

export function ResumeClient({ initialResumes }: { initialResumes: Resume[] }) {
  const router = useRouter()
  const [resumes, setResumes] = useState<Resume[]>(initialResumes)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())
  const [parsedProfiles, setParsedProfiles] = useState<Record<string, ResumeProfile>>({})

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResumes((prev) => [data.resume, ...prev])
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch('/api/resumes/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to set active resume')
      }

      setResumes((prev) =>
        prev.map((r) => ({ ...r, is_active: r.id === id }))
      )
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return

    try {
      const res = await fetch('/api/resumes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete resume')
      }

      setResumes((prev) => prev.filter((r) => r.id !== id))
      
      const newProfiles = { ...parsedProfiles }
      delete newProfiles[id]
      setParsedProfiles(newProfiles)
      
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDownload = (id: string) => {
    window.open(`/api/resumes/download?id=${id}`, '_blank')
  }

  const handleAnalyze = async (id: string) => {
    setError(null)
    setAnalyzingIds((prev) => new Set(prev).add(id))

    try {
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze resume')
      }

      setParsedProfiles((prev) => ({
        ...prev,
        [id]: data.profile
      }))
      
      // Update the local resumes array to indicate it has extracted text
      setResumes((prev) => prev.map((r) => 
        r.id === id ? { 
          ...r, 
          extracted_text: 'Analyzed', 
          skills: data.profile.skills,
          experience: data.profile.experience,
          education: data.profile.education
        } : r
      ))
      
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis')
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const renderProfile = (resumeId: string, resume: Resume) => {
    const profile = parsedProfiles[resumeId]
    
    // If we have local state profile, show full UI
    if (profile) {
      return (
        <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
          <h5 className="font-semibold text-gray-900 mb-3">Resume Analysis</h5>
          <div className="space-y-4">
            {profile.professional_title && (
              <div>
                <span className="font-medium text-gray-700">Professional Title:</span> {profile.professional_title}
              </div>
            )}
            {profile.summary && (
              <div>
                <span className="font-medium text-gray-700">Summary:</span>
                <p className="mt-1 text-gray-600">{profile.summary}</p>
              </div>
            )}
            {profile.technical_skills && profile.technical_skills.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Technical Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.technical_skills.map((s, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.soft_skills && profile.soft_skills.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Soft Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.soft_skills.map((s, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.experience && profile.experience.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Experience:</span>
                <ul className="list-disc pl-4 mt-1 text-gray-600">
                  {profile.experience.map((ex, i) => (
                    <li key={i}>{ex.job_title} at {ex.company}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile.education && profile.education.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Education:</span>
                <ul className="list-disc pl-4 mt-1 text-gray-600">
                  {profile.education.map((ed, i) => (
                    <li key={i}>{ed.degree} - {ed.institution}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile.projects && profile.projects.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Projects:</span>
                <ul className="list-disc pl-4 mt-1 text-gray-600">
                  {profile.projects.map((pr, i) => (
                    <li key={i}>{pr.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile.certifications && profile.certifications.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Certifications:</span>
                <ul className="list-disc pl-4 mt-1 text-gray-600">
                  {profile.certifications.map((cert, i) => (
                    <li key={i}>{cert}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )
    }

    // If we only have DB data (page reload), show what we have in DB
    if (resume.skills || resume.experience || resume.education) {
       return (
        <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
          <h5 className="font-semibold text-gray-900 mb-3">Saved Resume Analysis</h5>
          <div className="space-y-4">
            {resume.skills && Array.isArray(resume.skills) && (
              <div>
                <span className="font-medium text-gray-700">Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {resume.skills.map((s, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{String(s)}</span>
                  ))}
                </div>
              </div>
            )}
            {resume.experience && Array.isArray(resume.experience) && (
              <div>
                <span className="font-medium text-gray-700">Experience:</span>
                <ul className="list-disc pl-4 mt-1 text-gray-600">
                  {resume.experience.map((ex: unknown, i: number) => {
                    const typedEx = ex as Partial<ResumeExperience>;
                    return <li key={i}>{typedEx?.job_title} at {typedEx?.company}</li>
                  })}
                </ul>
              </div>
            )}
            {resume.education && Array.isArray(resume.education) && (
              <div>
                <span className="font-medium text-gray-700">Education:</span>
                <ul className="list-disc pl-4 mt-1 text-gray-600">
                  {resume.education.map((ed: unknown, i: number) => {
                    const typedEd = ed as Partial<ResumeEducation>;
                    return <li key={i}>{typedEd?.degree} - {typedEd?.institution}</li>
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
       )
    }

    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Resume</h1>
        <p className="text-gray-500">Manage the resume used for AI job matching.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-10 bg-gray-50 hover:bg-gray-100 transition-colors">
            <Upload className="h-10 w-10 text-gray-400 mb-4" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              {isUploading ? 'Uploading...' : 'Click to choose a file'}
            </p>
            <p className="text-xs text-gray-500 mb-4">PDF only, maximum 10 MB</p>
            <div className="relative">
              <Button disabled={isUploading}>Choose PDF</Button>
              <input
                type="file"
                accept="application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleUpload}
                disabled={isUploading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Your Resumes</h3>
        
        {resumes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No resumes uploaded yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {resumes.map((resume) => {
              const isAnalyzing = analyzingIds.has(resume.id)
              const hasExtractedText = !!resume.extracted_text
              
              return (
                <Card key={resume.id} className={resume.is_active ? 'border-blue-200 bg-blue-50/30' : ''}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${resume.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            {resume.file_name}
                            {resume.is_active && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            Uploaded: {new Date(resume.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-xs">
                              {isAnalyzing ? 'Analyzing...' : hasExtractedText ? 'Analyzed ✓' : 'Uploaded'}
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAnalyze(resume.id)}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                          ) : hasExtractedText ? (
                            <><Search className="h-4 w-4 mr-2" /> Re-analyze Resume</>
                          ) : (
                            <><Search className="h-4 w-4 mr-2" /> Analyze Resume</>
                          )}
                        </Button>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(resume.id)}
                        >
                          <Download className="h-4 w-4 mr-2" /> View
                        </Button>
                        
                        {!resume.is_active && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSetActive(resume.id)}
                          >
                            Set as Active
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-gray-200"
                          onClick={() => handleDelete(resume.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {renderProfile(resume.id, resume)}

                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

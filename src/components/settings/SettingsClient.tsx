'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { AlertTriangle, Mail, Loader2, CheckCircle2 } from 'lucide-react'

export function SettingsClient({ isSmtpConfigured }: { isSmtpConfigured: boolean }) {
  const [isTesting, setIsTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const handleTestEmail = async () => {
    setIsTesting(true)
    setTestSuccess(null)
    setTestError(null)

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST'
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      setTestSuccess(data.message || 'Test email sent successfully.')
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your application preferences and AI configuration.</p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Job Matching</CardTitle>
            <CardDescription>Configure how strict the AI should be when matching jobs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md">
              <label htmlFor="minScore" className="block text-sm font-medium leading-6 text-gray-900">
                Minimum Match Score (%)
              </label>
              <div className="mt-2 flex items-center gap-4">
                <Input id="minScore" type="number" defaultValue="50" min="0" max="100" className="w-24" />
                <span className="text-sm text-gray-500">Jobs below this score will be skipped automatically.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Auto Apply</CardTitle>
            <CardDescription>Control whether applications are sent automatically or require your review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
              <div className="space-y-0.5">
                <label className="text-base font-semibold text-gray-900">Auto Send Applications</label>
                <p className="text-sm text-gray-500">Automatically generate and send emails for matched jobs.</p>
              </div>
              <div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                  OFF
                </span>
              </div>
            </div>
            
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      It is highly recommended to keep auto-send OFF initially. Review the generated emails manually to ensure quality before enabling automatic sending.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Email Configuration</CardTitle>
            <CardDescription>Configure your SMTP connection for sending applications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Mail className="h-4 w-4" /> SMTP Status
                </label>
                <p className="text-sm text-gray-500">Emails will be sent using the configured environment variables.</p>
              </div>
              <div>
                {isSmtpConfigured ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                    Not Configured
                  </span>
                )}
              </div>
            </div>

            {isSmtpConfigured && (
              <div className="pt-2">
                <Button onClick={handleTestEmail} disabled={isTesting}>
                  {isTesting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    'Send Test Email'
                  )}
                </Button>
                {testSuccess && (
                  <p className="mt-3 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> {testSuccess}
                  </p>
                )}
                {testError && (
                  <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> {testError}
                  </p>
                )}
              </div>
            )}

            <div className="pt-4 border-t">
              <label htmlFor="signature" className="block text-sm font-medium leading-6 text-gray-900">
                Email Signature
              </label>
              <div className="mt-2">
                <Textarea 
                  id="signature" 
                  rows={4} 
                  defaultValue={`Best regards,\nYashvi Shah\nFull Stack Developer\nhttps://linkedin.com/in/yashvi`}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">This signature will be appended to all generated emails.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Application Preferences</CardTitle>
            <CardDescription>Add additional context for the AI when matching jobs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="locations" className="block text-sm font-medium leading-6 text-gray-900">
                  Preferred Locations
                </label>
                <div className="mt-2">
                  <Input id="locations" defaultValue="Ahmedabad, Remote" placeholder="e.g. New York, Remote" />
                </div>
              </div>
              <div>
                <label htmlFor="roles" className="block text-sm font-medium leading-6 text-gray-900">
                  Preferred Job Roles
                </label>
                <div className="mt-2">
                  <Input id="roles" defaultValue="Frontend Developer, Next.js Developer" placeholder="e.g. Frontend Developer" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Cancel</Button>
          <Button>Save Settings</Button>
        </div>
      </div>
    </div>
  )
}

import { SettingsClient } from '@/components/settings/SettingsClient'

export default function SettingsPage() {
  const isSmtpConfigured = !!(
    process.env.SMTP_HOST && 
    process.env.SMTP_PORT && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASSWORD
  )

  return <SettingsClient isSmtpConfigured={isSmtpConfigured} />
}

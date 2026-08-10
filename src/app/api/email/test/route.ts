import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSmtpTransporter, getSmtpFromEmail, getSmtpFromName } from '@/lib/email/smtp'

export async function POST(_request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized or missing user email' }, { status: 401 })
    }

    const transporter = getSmtpTransporter()
    if (!transporter) {
      return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 400 })
    }

    const fromStr = `"${getSmtpFromName()}" <${getSmtpFromEmail()}>`
    
    try {
      await transporter.verify() // Validate connection early
      await transporter.sendMail({
        from: fromStr,
        to: user.email, // Send strictly to authenticated user's email
        subject: 'Test Email - Job Auto Apply AI',
        text: 'This is a test email to confirm that your SMTP configuration is working correctly.',
      })
    } catch (smtpErr) {
      console.error('SMTP Test Error:', smtpErr)
      return NextResponse.json({ error: 'Failed to send test email. Check your SMTP configuration.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Test email sent successfully.' })

  } catch (err: unknown) {
    console.error('Test Email Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred during test email sending.' }, { status: 500 })
  }
}

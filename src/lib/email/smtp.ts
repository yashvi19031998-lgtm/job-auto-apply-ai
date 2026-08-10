import nodemailer from 'nodemailer'

export function getSmtpTransporter() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  if (!host || !port || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure,
    auth: {
      user,
      pass,
    },
  })
}

export function getSmtpFromName() {
  return process.env.SMTP_FROM_NAME || 'Job Auto Apply AI'
}

export function getSmtpFromEmail() {
  return process.env.SMTP_USER || 'no-reply@example.com'
}

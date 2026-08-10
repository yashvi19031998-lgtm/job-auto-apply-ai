# Job Auto Apply AI

An intelligent job application assistant that parses your resume, extracts jobs from sources like WhatsApp, scores the jobs against your skills, and automatically drafts and sends customized application emails. 

## Features
- **Resume Parsing**: Upload a PDF resume to securely extract and store your professional profile.
- **WhatsApp Job Extraction**: Paste raw WhatsApp job alerts to instantly extract them into structured data.
- **Job Matching**: A deterministic algorithm matches required skills against your resume.
- **Automated Mock Application Emails**: Drafts personalized emails tailored to the job's required skills.
- **SMTP Integration**: Directly sends your applications via standard SMTP with your resume PDF securely attached.

## Local Development

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Environment Variables
Copy `.env.example` to `.env.local` and configure your environment variables.

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=Your Name
```

> **Security Note**: Never commit your `.env.local` file or expose your `SUPABASE_SERVICE_ROLE_KEY` or `SMTP_PASSWORD` to the public or client-side code.

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

## Supabase Setup
1. Create a project in Supabase.
2. Enable Email Auth.
3. Create a private storage bucket named `resumes`.
4. Deploy your database schema (profiles, resumes, job_batches, jobs, applications, settings).

## Vercel Deployment
This application is fully compatible with Vercel serverless deployment.

1. Push your repository to GitHub.
2. Import the project into your Vercel dashboard.
3. Under **Environment Variables**, add all the variables from your `.env.local` file.
4. Click **Deploy**.

## Security
- This application relies on server-side SMTP execution. Passwords are never sent to or exposed in the browser.
- Resume PDFs are retrieved securely on the server directly from private Supabase Storage and never exposed publicly.
- Next.js security headers are implemented in `next.config.ts`.

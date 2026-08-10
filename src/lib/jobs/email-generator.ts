import { Database } from '@/types/database'
import { ApplicationEmail } from '@/types/application'

type JobRow = Database['public']['Tables']['jobs']['Row']
type ResumeRow = Database['public']['Tables']['resumes']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type SettingsRow = Database['public']['Tables']['settings']['Row']

export function generateApplicationEmail(
  job: JobRow,
  resume: ResumeRow,
  profile: ProfileRow,
  settings: SettingsRow
): ApplicationEmail {
  const userName = profile.full_name || 'Applicant'
  const jobTitle = job.job_title || 'Open Position'
  const companyName = job.company_name || 'your company'
  
  // Extract resume skills that match job skills
  const resumeSkillsRaw = (resume.skills as string[]) || []
  const jobSkills = job.required_skills || []
  
  const matchedSkills = resumeSkillsRaw.filter(rs => 
    jobSkills.some(js => js.toLowerCase() === rs.toLowerCase())
  )
  
  // If no direct matches, just take top 3 skills from resume
  const relevantSkills = matchedSkills.length > 0 
    ? matchedSkills.slice(0, 4) 
    : resumeSkillsRaw.slice(0, 4)

  let skillsText = ''
  if (relevantSkills.length > 0) {
    if (relevantSkills.length === 1) {
      skillsText = relevantSkills[0]
    } else {
      const last = relevantSkills.pop()
      skillsText = `${relevantSkills.join(', ')} and ${last}`
    }
  }

  const subject = `Application for ${jobTitle} – ${userName}`
  
  let body = `Dear Hiring Team,\n\nI am writing to apply for the ${jobTitle} position at ${companyName}.\n\n`
  
  if (skillsText) {
    body += `With experience in ${skillsText}, I believe my background aligns well with the requirements of this role.\n\n`
  }
  
  body += `Please find my resume attached for your consideration. I would appreciate the opportunity to discuss how my skills and experience could contribute to your team.\n\nThank you for your time and consideration.\n\nBest regards,\n${userName}`

  if (settings.email_signature) {
    body += `\n\n--\n${settings.email_signature}`
  }

  return {
    subject,
    body,
    emailTo: job.email || ''
  }
}

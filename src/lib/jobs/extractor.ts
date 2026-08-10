import { ExtractedJob } from '@/types/job'

const COMMON_SKILLS = [
  'react', 'next.js', 'angular', 'vue', 'javascript', 'typescript',
  'node.js', 'nestjs', 'express', 'php', 'laravel', 'codeigniter',
  'python', 'django', 'java', 'spring boot', '.net', 'c#',
  'html', 'css', 'tailwind css', 'mysql', 'postgresql', 'mongodb',
  'redis', 'docker', 'aws', 'git', 'rest api', 'graphql'
]

const TITLES = [
  'frontend developer', 'backend developer', 'full stack developer',
  'react developer', 'next.js developer', 'node.js developer',
  'php developer', 'laravel developer', 'software engineer',
  'web developer', 'ui developer', 'angular developer'
]

function extractEmail(text: string): string | null {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i
  const match = text.match(emailRegex)
  return match ? match[1].toLowerCase().trim() : null
}

function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/i
  const match = text.match(urlRegex)
  return match ? match[1].trim() : null
}

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase()
  const foundSkills = COMMON_SKILLS.filter(skill => lowerText.includes(skill.toLowerCase()))
  
  // Custom skills check
  const skillsRegex = /(?:skills?|technologies|required):?\s*(.*?)(?:\n|$)/i
  const match = text.match(skillsRegex)
  if (match && match[1]) {
    const custom = match[1].split(/[,|]/).map(s => s.trim()).filter(s => s.length > 1)
    custom.forEach(c => {
      const lowerC = c.toLowerCase()
      if (!foundSkills.some(fs => fs.toLowerCase() === lowerC)) {
        // basic cleanup
        foundSkills.push(c)
      }
    })
  }

  return [...new Set(foundSkills)]
}

function extractExperience(text: string): { min: number | null, max: number | null } {
  const expRegex = /(?:experience|exp)[^\d]*(\d+)(?:\s*(?:-|to)\s*(\d+))?\s*(?:years?|yrs?|\+)?/i
  const match = text.match(expRegex)
  if (match) {
    const min = parseInt(match[1], 10)
    const max = match[2] ? parseInt(match[2], 10) : (text.match(/(\d+)\s*\+/i) ? null : min)
    return { min, max }
  }
  return { min: null, max: null }
}

function extractCompany(text: string): string | null {
  const companyRegex = /(?:company|organization|hiring company):?\s*(.*?)(?:\n|$)/i
  const match = text.match(companyRegex)
  return match ? match[1].trim() : null
}

function extractLocation(text: string): string | null {
  const locationRegex = /(?:location|work location|based in):?\s*(.*?)(?:\n|$)/i
  const match = text.match(locationRegex)
  return match ? match[1].trim() : null
}

function extractTitle(text: string): string | null {
  const lowerText = text.toLowerCase()
  for (const title of TITLES) {
    if (lowerText.includes(title)) {
      // Return proper case
      return title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
  }

  const titleRegex = /(?:role|title|position|hiring):?\s*(.*?)(?:\n|$)/i
  const match = text.match(titleRegex)
  return match ? match[1].trim() : null
}

function parseJobBlock(block: string): ExtractedJob {
  const { min, max } = extractExperience(block)
  return {
    company_name: extractCompany(block),
    job_title: extractTitle(block),
    job_description: block.trim(),
    experience_min: min,
    experience_max: max,
    location: extractLocation(block),
    email: extractEmail(block),
    application_url: extractUrl(block),
    required_skills: extractSkills(block),
    source_text: block.trim()
  }
}

export function extractJobsFromChat(rawChat: string): ExtractedJob[] {
  // Split by WhatsApp timestamps like [10/08/2026, 8:12 AM] or blank lines
  // Sometimes multiple messages form one job.
  
  // Clean up typical whatsapp formatting
  let cleanChat = rawChat.replace(/\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s\d{1,2}:\d{2}\s?(?:AM|PM)\]\s*.*?:/ig, '---JOB_START---')
  
  // If no timestamps, try to split by repeated blank lines
  if (!cleanChat.includes('---JOB_START---')) {
    cleanChat = cleanChat.split(/\n\s*\n/).join('\n---JOB_START---\n')
  }

  const blocks = cleanChat.split('---JOB_START---')
    .map(b => b.trim())
    .filter(b => b.length > 10)

  const jobs: ExtractedJob[] = []
  
  for (const block of blocks) {
    const job = parseJobBlock(block)
    
    // Minimum validation to be considered a job
    if (job.job_title || job.company_name || job.email || job.application_url) {
      jobs.push(job)
    }
  }

  return jobs
}

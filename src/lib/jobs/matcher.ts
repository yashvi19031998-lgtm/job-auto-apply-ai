import { Database } from '@/types/database'
import { JobMatchResult } from '@/types/job'

type JobRow = Database['public']['Tables']['jobs']['Row']
type ResumeRow = Database['public']['Tables']['resumes']['Row']

// Basic normalizer to handle common cases like "Node.js" vs "Node", "React.js" vs "React"
function normalizeSkill(skill: string): string {
  const s = skill.toLowerCase().trim()
  if (s === 'react.js' || s === 'reactjs') return 'react'
  if (s === 'node.js' || s === 'nodejs') return 'node'
  if (s === 'vue.js' || s === 'vuejs') return 'vue'
  if (s === 'js') return 'javascript'
  if (s === 'ts') return 'typescript'
  if (s === 'postgres') return 'postgresql'
  return s
}

function parseExperienceArray(exp: unknown): { title: string, description: string }[] {
  if (!exp || !Array.isArray(exp)) return []
  return exp.map((e: Record<string, unknown>) => ({
    title: (e?.title as string) || '',
    description: (e?.description as string) || ''
  }))
}

export function matchJob(job: JobRow, resume: ResumeRow): JobMatchResult {
  let score = 0
  const matchedSkills: string[] = []
  const missingSkills: string[] = []
  const technologyMatches: string[] = []

  // Extract resume data
  const resumeSkillsRaw = (resume.skills as string[]) || []
  const resumeSkills = resumeSkillsRaw.map(normalizeSkill)
  
  const resumeExperience = parseExperienceArray(resume.experience)
  const resumeText = (resume.extracted_text || '').toLowerCase()
  const resumeTitles = resumeExperience.map(e => e.title.toLowerCase())

  // 1. Skill Match (Max 60 points)
  const jobSkills = job.required_skills || []
  if (jobSkills.length > 0) {
    let matches = 0
    for (const skill of jobSkills) {
      const normJobSkill = normalizeSkill(skill)
      if (resumeSkills.includes(normJobSkill) || resumeText.includes(normJobSkill)) {
        matches++
        matchedSkills.push(skill)
      } else {
        missingSkills.push(skill)
      }
    }
    const skillScore = (matches / jobSkills.length) * 60
    score += skillScore
  } else {
    // If no specific skills required, give 60 points to not penalize
    score += 60
  }

  // 2. Job Title / Role Match (Max 20 points)
  let roleMatch = false
  const jobTitle = (job.job_title || '').toLowerCase()
  if (jobTitle) {
    if (resumeTitles.some(rt => rt.includes(jobTitle) || jobTitle.includes(rt))) {
      roleMatch = true
      score += 20
    } else {
      // Partial title match logic
      const titleWords = jobTitle.split(/[\s-]+/).filter(w => w.length > 3)
      const partialMatch = titleWords.some(tw => resumeTitles.some(rt => rt.includes(tw)) || resumeText.includes(tw))
      if (partialMatch) {
        roleMatch = true
        score += 10
      }
    }
  } else {
    score += 20
  }

  // 3. Experience Match (Max 15 points)
  let experienceMatch: boolean | null = null
  if (job.experience_min !== null) {
    // Basic heuristic: check if any experience entry seems to have > min years, or just text heuristic
    // For mock purposes, if resume has any experience items, we check length of items as a very crude proxy, 
    // or we just assume they have the experience if they have more than X items.
    // Better heuristic: count years from resumeText if possible, or just look for "X years"
    
    // Simple mock heuristic: 
    // If job min experience <= 2, give full points. 
    // If > 2, require at least that many experience entries.
    const assumedYears = resumeExperience.length * 1.5 
    
    if (assumedYears >= job.experience_min) {
      experienceMatch = true
      score += 15
    } else {
      experienceMatch = false
      score += 5 // partial points
    }
  } else {
    // No experience required
    score += 15
  }

  // 4. Description/Technology Match (Max 5 points)
  const jobDesc = (job.job_description || '').toLowerCase()
  const techKeywords = ['aws', 'docker', 'kubernetes', 'ci/cd', 'git', 'agile', 'rest', 'graphql', 'sql', 'nosql', 'linux']
  let techScore = 0
  for (const tech of techKeywords) {
    if (jobDesc.includes(tech) && resumeText.includes(tech)) {
      technologyMatches.push(tech)
      techScore += 1
    }
  }
  score += Math.min(techScore, 5)

  // Clamp score
  score = Math.round(Math.min(Math.max(score, 0), 100))

  // Determine Reason
  let reason = `Match score is ${score}%. `
  if (roleMatch) reason += `Strong alignment with the ${job.job_title} role. `
  if (matchedSkills.length > 0) reason += `Matches key skills like ${matchedSkills.slice(0, 3).join(', ')}. `
  if (missingSkills.length > 0) reason += `Missing some requested skills such as ${missingSkills.slice(0, 2).join(', ')}. `

  return {
    score,
    matchedSkills,
    missingSkills,
    roleMatch,
    experienceMatch,
    technologyMatches,
    reason: reason.trim()
  }
}

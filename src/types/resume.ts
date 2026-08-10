export interface ResumeExperience {
  job_title: string | null
  company: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  technologies: string[]
}

export interface ResumeEducation {
  degree: string | null
  institution: string | null
  start_date: string | null
  end_date: string | null
}

export interface ResumeProject {
  name: string | null
  description: string | null
  technologies: string[]
}

export interface ResumeProfile {
  full_name: string | null
  professional_title: string | null
  summary: string | null
  skills: string[]
  technical_skills: string[]
  soft_skills: string[]
  experience: ResumeExperience[]
  education: ResumeEducation[]
  projects: ResumeProject[]
  certifications: string[]
  total_experience_years: number | null
  locations: string[]
}

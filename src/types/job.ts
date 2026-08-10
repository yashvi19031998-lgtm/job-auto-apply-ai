export interface ExtractedJob {
  company_name: string | null
  job_title: string | null
  job_description: string | null
  experience_min: number | null
  experience_max: number | null
  location: string | null
  email: string | null
  application_url: string | null
  required_skills: string[]
  source_text: string
}

export interface JobImportResult {
  jobs_found: number
  jobs_saved: number
  duplicates: number
  skipped: number
}

export interface JobBatch {
  id: string
  user_id: string
  batch_name: string
  raw_chat: string
  jobs_found: number
  created_at: string
}

export interface JobFilters {
  search?: string
  status?: string
  location?: string
}

export interface JobMatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  roleMatch: boolean;
  experienceMatch: boolean | null;
  technologyMatches: string[];
  reason: string;
}

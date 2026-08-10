export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          is_active: boolean
          created_at: string
          extracted_text: string | null
          skills: Json | null
          experience: Json | null
          education: Json | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          is_active?: boolean
          created_at?: string
          extracted_text?: string | null
          skills?: Json | null
          experience?: Json | null
          education?: Json | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          is_active?: boolean
          created_at?: string
          extracted_text?: string | null
          skills?: Json | null
          experience?: Json | null
          education?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          user_id: string
          minimum_match_score: number
          auto_send_enabled: boolean
          email_signature: string | null
          preferred_locations: string[]
          preferred_job_roles: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          minimum_match_score?: number
          auto_send_enabled?: boolean
          email_signature?: string | null
          preferred_locations?: string[]
          preferred_job_roles?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          minimum_match_score?: number
          auto_send_enabled?: boolean
          email_signature?: string | null
          preferred_locations?: string[]
          preferred_job_roles?: string[]
          created_at?: string
        }
        Relationships: []
      }
      job_batches: {
        Row: {
          id: string
          user_id: string
          batch_name: string
          raw_chat: string
          jobs_found: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          batch_name: string
          raw_chat: string
          jobs_found: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          batch_name?: string
          raw_chat?: string
          jobs_found?: number
          created_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          batch_id: string
          company_name: string | null
          job_title: string | null
          job_description: string | null
          experience_min: number | null
          experience_max: number | null
          location: string | null
          email: string | null
          application_url: string | null
          required_skills: string[]
          match_score: number | null
          match_reason: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          batch_id: string
          company_name?: string | null
          job_title?: string | null
          job_description?: string | null
          experience_min?: number | null
          experience_max?: number | null
          location?: string | null
          email?: string | null
          application_url?: string | null
          required_skills?: string[]
          match_score?: number | null
          match_reason?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          batch_id?: string
          company_name?: string | null
          job_title?: string | null
          job_description?: string | null
          experience_min?: number | null
          experience_max?: number | null
          location?: string | null
          email?: string | null
          application_url?: string | null
          required_skills?: string[]
          match_score?: number | null
          match_reason?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          id: string
          user_id: string
          job_id: string
          status: string
          email_to: string
          email_subject: string
          email_body: string
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          status?: string
          email_to: string
          email_subject: string
          email_body: string
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string
          status?: string
          email_to?: string
          email_subject?: string
          email_body?: string
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

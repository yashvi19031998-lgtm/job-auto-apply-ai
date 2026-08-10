import { Database } from './database'

export type ApplicationRow = Database['public']['Tables']['applications']['Row']

export type ApplicationStatus = 'Pending' | 'Sent' | 'Failed' | 'Skipped' | 'Duplicate'

export interface ApplicationEmail {
  subject: string;
  body: string;
  emailTo: string;
}

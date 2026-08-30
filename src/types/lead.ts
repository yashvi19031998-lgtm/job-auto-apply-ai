export interface Lead {
  id: string;
  source: string;
  leadType: "job" | "freelance";
  title: string;
  company?: string;
  description?: string;
  location?: string;
  url: string;
  postedAt?: string;
  budget?: string;
  skills?: string[];
  matchScore?: number;
  matchReason?: string;
}

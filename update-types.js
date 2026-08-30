const fs = require('fs');
const path = require('path');

const typesPath = path.join('e:', 'MyWork', 'job-auto-apply-ai', 'src', 'types', 'index.ts');
let content = fs.readFileSync(typesPath, 'utf8');

const newType = \`

export interface AutoScoutLead {
  id: string;
  source: string;
  jobTitle: string;
  company: string;
  location: string;
  jobUrl: string;
  fullDescription: string;
  recipientEmail?: string;
  phone?: string;
  applicationUrl?: string;
  recruiterName?: string;
  matchScore?: number;
  status: 'new' | 'applied' | 'no_email' | 'failed';
  firstSeenAt: number;
  lastSeenAt: number;
  appliedAt?: number;
  errorReason?: string;
}
\`;

if (!content.includes('AutoScoutLead')) {
  fs.writeFileSync(typesPath, content + newType);
  console.log('Updated index.ts');
}

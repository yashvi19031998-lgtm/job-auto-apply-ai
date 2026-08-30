const fs = require('fs');
const path = require('path');

const pageTsxPath = path.join('e:', 'MyWork', 'job-auto-apply-ai', 'src', 'app', 'lead-scout', 'page.tsx');
let pageTsx = fs.readFileSync(pageTsxPath, 'utf8');

pageTsx = pageTsx.replace(
  "const [sources, setSources] = useState<ApifySource[]>(['linkedin']);",
  "const [sources, setSources] = useState<(ApifySource | 'gemini')[]>(['gemini']);"
);

pageTsx = pageTsx.replace(
  "const availableSources: { id: ApifySource; name: string; type: 'job' | 'freelance' | 'both' }[] = [\n    { id: 'linkedin', name: 'LinkedIn', type: 'job' },\n    { id: 'naukri', name: 'Naukri', type: 'job' },\n    { id: 'indeed', name: 'Indeed', type: 'job' },\n    { id: 'wellfound', name: 'Wellfound', type: 'job' },\n    { id: 'remoteOk', name: 'Remote OK', type: 'job' },\n    { id: 'upwork', name: 'Upwork', type: 'freelance' },\n    { id: 'freelancer', name: 'Freelancer', type: 'freelance' },\n    { id: 'web', name: 'Web', type: 'both' },\n  ];",
  `const availableSources: { id: ApifySource | 'gemini'; name: string; type: 'job' | 'freelance' | 'both' }[] = [
    { id: 'gemini', name: 'Gemini Web Search', type: 'both' },
    { id: 'linkedin', name: 'LinkedIn', type: 'job' },
    { id: 'naukri', name: 'Naukri', type: 'job' },
    { id: 'indeed', name: 'Indeed', type: 'job' },
    { id: 'wellfound', name: 'Wellfound', type: 'job' },
    { id: 'remoteOk', name: 'Remote OK', type: 'job' },
    { id: 'upwork', name: 'Upwork', type: 'freelance' },
    { id: 'freelancer', name: 'Freelancer', type: 'freelance' },
    { id: 'web', name: 'Web', type: 'both' },
  ];`
);

pageTsx = pageTsx.replace(
  "const handleSourceToggle = (sourceId: ApifySource) => {",
  "const handleSourceToggle = (sourceId: ApifySource | 'gemini') => {"
);

fs.writeFileSync(pageTsxPath, pageTsx);
console.log('Updated page.tsx');

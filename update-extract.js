const fs = require('fs');
const path = require('path');

const extractPath = path.join('e:', 'MyWork', 'job-auto-apply-ai', 'src', 'app', 'api', 'extract', 'route.ts');
let extractTsx = fs.readFileSync(extractPath, 'utf8');

// Add new fields to the prompt
const newPromptFormat = \`{
  "jobs": [
    {
      "jobTitle": "String or null",
      "company": "String or null",
      "recruiterName": "String or null",
      "recipientEmail": "String or null (Must be a valid email format)",
      "phone": "String or null (Extract explicitly)",
      "applicationUrl": "String or null (Extract explicitly, e.g. 'Apply here: https...')",
      "companyWebsite": "String or null",
      "alternateContact": "String or null (Extract ANY available contact info: WhatsApp number, Phone number, LinkedIn profile, or Website link. If Job Link is provided, ALWAYS include it here.)",
      "requirements": "A concise bulleted list string of key skills and responsibilities."
    }
  ]
}\`;

extractTsx = extractTsx.replace(/\{\n  "jobs": \[\n    \{\n      "jobTitle"[\s\S]*?"requirements":.*?\n    \}\n  \]\n\}/g, newPromptFormat);

const newPagePrompt = \`
Extract the official company email address AND contact phone number from the following webpage text. 
Do NOT fabricate, invent, or guess. Only return what explicitly appears in the text.
Return strictly a JSON object: { "email": "the_email_found_or_null", "phone": "the_phone_found_or_null" }

Webpage Text:
\${strippedText}
\`;
// Already implemented in original file, but we will ensure job gets the new phone field
extractTsx = extractTsx.replace(
  \`if (pageParsed.phone) {
                    job.alternateContact = job.alternateContact ? \\\`\${job.alternateContact} | Phone: \${pageParsed.phone}\\\` : \\\`Phone: \${pageParsed.phone}\\\`;
                  }\`,
  \`if (pageParsed.phone) {
                    job.phone = pageParsed.phone;
                    job.alternateContact = job.alternateContact ? \\\`\${job.alternateContact} | Phone: \${pageParsed.phone}\\\` : \\\`Phone: \${pageParsed.phone}\\\`;
                  }\`
);

fs.writeFileSync(extractPath, extractTsx);
console.log('Updated extract route');

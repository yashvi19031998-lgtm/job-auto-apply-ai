const fs = require('fs');
const path = require('path');

const routeTsxPath = path.join('e:', 'MyWork', 'job-auto-apply-ai', 'src', 'app', 'api', 'lead-scout', 'route.ts');
let routeTsx = fs.readFileSync(routeTsxPath, 'utf8');

// Replace the source type checking and iteration
const searchCode = \`
    const apifySources = sources.filter((s: string) => s !== 'gemini') as ApifySource[];
    const hasGemini = sources.includes('gemini');

    // Run actors concurrently with a reasonable limit
    const promises = apifySources.map((source: ApifySource) => 
      runApifyActor(source, { keywords, location, limit })
        .then(items => ({ source, items }))
        .catch(err => ({ source, error: err.message }))
    );

    if (hasGemini) {
      promises.push((async () => {
        try {
          const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            tools: [{ googleSearch: {} }]
          });

          const prompt = \` + "\`" + \`
            Search for recent job and freelance postings matching these criteria:
            Keywords: \${keywords || 'any'}
            Location: \${location || 'any'}
            
            Find actual specific job postings. Look on LinkedIn, Naukri, Indeed, Upwork, Wellfound, RemoteOk, etc.
            Do NOT hallucinate URLs. Only return a lead if you have a real URL to the job posting.
            If you cannot find real URLs, return an empty array [].
            
            Output a JSON array of objects matching this exact structure:
            [{
              "id": "unique-id",
              "source": "gemini-search",
              "leadType": "job" or "freelance",
              "title": "Job Title",
              "company": "Company Name",
              "description": "Short description...",
              "location": "Location",
              "url": "https://actual-link-to-job"
            }]
          \` + "\`" + \`;

          const aiResult = await model.generateContent(prompt);
          const responseText = aiResult.response.text();
          
          let parsed;
          try {
            const cleaned = responseText.replace(/\\x60\\x60\\x60json/g, '').replace(/\\x60\\x60\\x60/g, '').trim();
            parsed = JSON.parse(cleaned);
          } catch(e) {
            throw new Error("Failed to parse Gemini JSON: " + responseText.substring(0,100));
          }

          if (!Array.isArray(parsed)) {
            parsed = [];
          }

          // Validate URLs
          const validLeads = parsed.filter((l: any) => l.title && l.url && String(l.url).startsWith('http') && !String(l.url).includes('google.com/search'));
          
          return { source: 'gemini', items: validLeads };
        } catch (err: any) {
          return { source: 'gemini', error: err.message || 'Gemini Search failed' };
        }
      })() as any);
    }
\`;

routeTsx = routeTsx.replace(
  \`    // Run actors concurrently with a reasonable limit
    const promises = sources.map((source: ApifySource) => 
      runApifyActor(source, { keywords, location, limit })
        .then(items => ({ source, items }))
        .catch(err => ({ source, error: err.message }))
    );\`,
  searchCode
);

const normalizeCode = \`
        if ('error' in result.value) {
          errors[result.value.source] = result.value.error;
        } else {
          if (result.value.source === 'gemini') {
            allLeads = allLeads.concat(result.value.items as Lead[]);
          } else {
            const normalized = normalizeApifyResults(result.value.source as ApifySource, result.value.items);
            allLeads = allLeads.concat(normalized);
          }
        }
\`;

routeTsx = routeTsx.replace(
  \`        if ('error' in result.value) {
          errors[result.value.source] = result.value.error;
        } else {
          const normalized = normalizeApifyResults(result.value.source, result.value.items);
          allLeads = allLeads.concat(normalized);
        }\`,
  normalizeCode
);

fs.writeFileSync(routeTsxPath, routeTsx);
console.log('Updated route.ts');

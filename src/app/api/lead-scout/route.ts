import { NextRequest, NextResponse } from 'next/server';
import { runApifyActor, ApifySource } from '@/lib/apify/client';
import { normalizeApifyResults, deduplicateLeads } from '@/lib/apify/normalizers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead } from '@/types/lead';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { sources, keywords, location, limit, profile } = await req.json();

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json({ error: 'No sources selected' }, { status: 400 });
    }

    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json({ error: 'APIFY_API_TOKEN is missing on the server' }, { status: 500 });
    }

    const apifySources = sources.filter((s: string) => s !== 'gemini') as ApifySource[];
    const hasGemini = sources.includes('gemini');

    // Run actors concurrently with a reasonable limit
    const promises = apifySources.map((source: ApifySource) => 
      runApifyActor(source, { keywords, location, limit })
        .then(items => ({ source, items }))
        .catch(err => ({ source, error: err.message }))
    );

    if (hasGemini && process.env.GEMINI_API_KEY) {
      promises.push((async () => {
        try {
          const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            tools: [{ googleSearch: {} }]
          });

          const prompt = `
            Search for recent job and freelance postings matching these criteria:
            Keywords: ${keywords || 'any'}
            Location: ${location || 'any'}
            Type: ${req.url.includes('freelance') ? 'freelance projects' : 'job postings'}
            
            Find actual specific job postings. Look on LinkedIn, Naukri, Indeed, Upwork, Wellfound, RemoteOk, etc.
            Do NOT hallucinate URLs. Only return a lead if you have a real URL to the job posting.
            If you cannot find real URLs, return an empty array [].
            
            Output a JSON array of objects matching this exact structure:
            [{
              "id": "unique-id",
              "source": "gemini",
              "leadType": "job",
              "title": "Job Title",
              "company": "Company Name",
              "description": "Short description...",
              "location": "Location",
              "url": "https://actual-link-to-job"
            }]
          `;

          const aiResult = await model.generateContent(prompt);
          const responseText = aiResult.response.text();
          
          let parsed;
          try {
            const cleaned = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            parsed = JSON.parse(cleaned);
          } catch(e) {
            console.error("Failed to parse Gemini JSON", responseText.substring(0,200));
            parsed = [];
          }

          if (!Array.isArray(parsed)) {
            parsed = [];
          }

          // Validate URLs
          const validLeads = parsed.filter((l: any) => l.title && l.url && String(l.url).startsWith('http') && !String(l.url).includes('google.com/search'));
          
          return { source: 'gemini', items: validLeads };
        } catch (err: any) {
          console.error("Gemini Search failed", err.message);
          return { source: 'gemini', error: err.message || 'Gemini Search failed' };
        }
      })() as any);
    }

    const results = await Promise.allSettled(promises);

    let allLeads: Lead[] = [];
    const errors: Record<string, string> = {};

    results.forEach(result => {
      if (result.status === 'fulfilled') {
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
      }
    });

    // Deduplicate
    const uniqueLeads = deduplicateLeads(allLeads);

    if (uniqueLeads.length === 0) {
      return NextResponse.json({ leads: [], errors, message: 'No leads found.' });
    }

    // Use Gemini for matching and scoring if a profile is provided
    if (profile && process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const profileContext = `
        Title: ${profile.professional_title}
        Skills: ${profile.technical_skills?.join(', ')}
        Experience: ${profile.experience?.map((e: any) => e.job_title).join(', ')}
      `;

      // Score in batches of 5 to avoid token limits or timeouts
      const batchSize = 5;
      for (let i = 0; i < uniqueLeads.length; i += batchSize) {
        const batch = uniqueLeads.slice(i, i + batchSize);
        const batchPayload = batch.map(l => ({
          id: l.id,
          title: l.title,
          description: l.description?.substring(0, 500) || '', // Keep it short
        }));

        const prompt = `
          Evaluate the following job/freelance leads against the candidate's profile.
          Profile Context: ${profileContext}

          Leads:
          ${JSON.stringify(batchPayload, null, 2)}

          For each lead, calculate a match score (0-100), identify matched skills, missing skills, and provide a 1-sentence reason.
          Return ONLY a JSON array of objects with this structure:
          [
            {
              "id": "string (must match lead id)",
              "matchScore": number (0-100),
              "matchedSkills": ["skill1", "skill2"],
              "missingSkills": ["skill3"],
              "matchReason": "string"
            }
          ]
        `;

        try {
          const aiResult = await model.generateContent(prompt);
          const responseText = aiResult.response.text();
          const parsedScores = JSON.parse(responseText);

          if (Array.isArray(parsedScores)) {
            parsedScores.forEach((scoreObj: any) => {
              const leadIndex = uniqueLeads.findIndex(l => l.id === scoreObj.id);
              if (leadIndex !== -1) {
                uniqueLeads[leadIndex].matchScore = scoreObj.matchScore;
                uniqueLeads[leadIndex].matchReason = scoreObj.matchReason;
                // Add matched skills if available
                if (scoreObj.matchedSkills && Array.isArray(scoreObj.matchedSkills)) {
                  uniqueLeads[leadIndex].skills = scoreObj.matchedSkills;
                }
              }
            });
          }
        } catch (err) {
          console.error("Gemini matching error:", err);
          // Continue without scoring if Gemini fails
        }
      }

      // Sort by score (highest first)
      uniqueLeads.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return NextResponse.json({ leads: uniqueLeads, errors });
  } catch (error: any) {
    console.error('Lead Scout API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function extractEmailsFromHtml(html: string): string | null {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const matches = html.match(emailRegex);
  if (!matches) return null;
  
  const valid = matches.filter(e => {
    const lower = e.toLowerCase();
    return !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg') &&
           !lower.endsWith('.gif') && !lower.endsWith('.svg') && !lower.endsWith('.webp') && 
           !lower.includes('example') && !lower.includes('sentry') && !lower.includes('w3.org');
  });
  
  return valid.length > 0 ? valid[0] : null;
}

export async function POST(req: NextRequest) {
  try {
    const { text, inputType, jobType } = await req.json();

    if (!text) {
      return new NextResponse("Missing job text", { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse("GEMINI_API_KEY is not configured", { status: 500 });
    }

    const prompt = `
You are a highly capable AI assistant that extracts job details from text. 
The text might be a formal job description OR a raw, messy WhatsApp chat export containing MULTIPLE job postings.
Extract ALL distinct job postings found in the text. Ignore irrelevant chat messages, greetings, and spam.
Never guess or fabricate an email address. Only output an email if it's explicitly stated in the text.

Required JSON format:
{
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
}

Text to process:
${text}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) throw new Error("AI returned empty result");

    const parsed = JSON.parse(responseText);
    let jobs = parsed.jobs || [];

    const validJobs = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      let foundEmail = job.recipientEmail;

      // 1. Direct Page Fetch (Fix for Custom/WebSearch)
      if (!foundEmail && inputType === 'scraper' && job.alternateContact && job.alternateContact.startsWith('http') && !job.alternateContact.includes('linkedin.com')) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout to 8 seconds
          
          const pageRes = await fetch(job.alternateContact, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: controller.signal,
            cache: 'no-store'
          }).catch(() => null);
          clearTimeout(timeoutId);

          if (pageRes && pageRes.ok) {
            const html = await pageRes.text();
            
            // Fast Regex extraction FIRST (catches mailto: links before HTML stripping!)
            const regexEmail = extractEmailsFromHtml(html);
            if (regexEmail) {
               foundEmail = regexEmail;
            } else {
              // Fallback to Gemini if Regex fails
              const strippedText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                       .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                       .replace(/<[^>]+>/g, ' ')
                                       .replace(/\s+/g, ' ')
                                       .substring(0, 15000);

              const pagePrompt = `Extract explicit official company email from this webpage text. Return strictly JSON: { "email": "found_email" } or null. Text: ${strippedText}`;
              const pageResult = await model.generateContent(pagePrompt);
              const pageParsed = JSON.parse(pageResult.response.text());
              if (pageParsed && pageParsed.email) {
                foundEmail = pageParsed.email;
              }
            }
          }
        } catch (fetchErr) {
          console.error("Failed direct page fetch");
        }
      }

      // 2. DuckDuckGo Fallback (for LinkedIn where direct fetch is blocked)
      if (!foundEmail && job.company && job.company !== "LinkedIn Job" && job.company !== "Unknown") {
        try {
          const query = `${job.company} official website contact`;
          const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0'
            },
            body: `q=${encodeURIComponent(query)}`,
            cache: 'no-store'
          }).catch(() => null);
          
          if (ddgRes && ddgRes.ok) {
            const html = await ddgRes.text();
            const urlMatches = [...html.matchAll(/href=(["'])(.*?)\1/gi)].map(m => m[2]);
            const links = urlMatches.filter(u => u.startsWith('http') && !u.includes('duckduckgo') && !u.includes('linkedin'));
            let targetUrl = links.length > 0 ? links[0] : "";
            
            if (targetUrl) {
              job.companyWebsite = targetUrl;
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);
              const pageRes = await fetch(targetUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: controller.signal,
                cache: 'no-store'
              }).catch(() => null);
              clearTimeout(timeoutId);

              if (pageRes && pageRes.ok) {
                const pageHtml = await pageRes.text();
                
                const regexEmail = extractEmailsFromHtml(pageHtml);
                if (regexEmail) {
                   foundEmail = regexEmail;
                } else {
                  const strippedText = pageHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').substring(0, 15000);
                  const pagePrompt = `Extract company email AND contact phone. strictly JSON: { "email": "email_or_null", "phone": "phone_or_null" }. Text: ${strippedText}`;
                  const pageResult = await model.generateContent(pagePrompt);
                  const pageParsed = JSON.parse(pageResult.response.text());
                  
                  if (pageParsed) {
                    if (pageParsed.email) foundEmail = pageParsed.email;
                    if (pageParsed.phone) {
                      job.phone = pageParsed.phone;
                      job.alternateContact = job.alternateContact ? `${job.alternateContact} | Phone: ${pageParsed.phone}` : `Phone: ${pageParsed.phone}`;
                    }
                  }
                }
              }
            }
          }
        } catch (searchError) {
          console.error("DDG Search Error");
        }
      }

      if (foundEmail) job.recipientEmail = foundEmail;
      validJobs.push(job);
    }

    return NextResponse.json({ jobs: validJobs });

  } catch (error: any) {
    console.error("Extraction Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

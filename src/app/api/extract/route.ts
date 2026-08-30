import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const google = require('googlethis');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    // Process and verify emails
    const validJobs = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      let foundEmail = job.recipientEmail;

      // If it's from the scraper and we have a Job URL, try to fetch the page content directly
      if (!foundEmail && inputType === 'scraper' && job.alternateContact && job.alternateContact.startsWith('http')) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const pageRes = await fetch(job.alternateContact, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: controller.signal,
            cache: 'no-store'
          });
          clearTimeout(timeoutId);

          if (pageRes.ok) {
            const html = await pageRes.text();
            // Simple regex to strip HTML tags and scripts
            const strippedText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                     .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                     .replace(/<[^>]+>/g, ' ')
                                     .replace(/\s+/g, ' ')
                                     .substring(0, 15000); // Send max 15k chars to AI

            const pagePrompt = `
Extract any explicit official company email address from the following webpage text. 
Do NOT fabricate, invent, or guess. Only return the email if it explicitly appears in the text.
Return strictly a JSON object: { "email": "the_email_found" } or { "email": null } if none is found.

Webpage Text:
${strippedText}
`;
            const pageResult = await model.generateContent(pagePrompt);
            const pageParsed = JSON.parse(pageResult.response.text());
            if (pageParsed && pageParsed.email) {
              foundEmail = pageParsed.email;
            }
          }
        } catch (fetchErr) {
          console.error("Failed to fetch page content for email verification:", fetchErr);
        }
      }

      // Fallback: Web search for missing emails if not found on page
      if (!foundEmail && job.company && job.company !== "LinkedIn Job") {
        try {
          const query = `${job.company} official website contact`;
          const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: `q=${encodeURIComponent(query)}`,
            cache: 'no-store'
          });
          
          if (ddgRes.ok) {
            const html = await ddgRes.text();
            const urlMatches = [...html.matchAll(/href=(["'])(.*?)\1/gi)].map(m => m[2]);
            const links = urlMatches.filter(u => u.startsWith('http') && !u.includes('duckduckgo') && !u.includes('w3.org') && !u.includes('linkedin.com') && !u.includes('glassdoor'));
            let targetUrl = links.length > 0 ? links[0] : "";
            
            if (targetUrl) {
              job.companyWebsite = targetUrl;
              // Now fetch the contact page
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 6000);
              const pageRes = await fetch(targetUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: controller.signal,
                cache: 'no-store'
              }).catch(() => null);
              clearTimeout(timeoutId);

              if (pageRes && pageRes.ok) {
                const pageHtml = await pageRes.text();
                const strippedText = pageHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                         .replace(/<[^>]+>/g, ' ')
                                         .replace(/\s+/g, ' ')
                                         .substring(0, 15000);

                const pagePrompt = `
Extract the official company email address AND contact phone number from the following webpage text. 
Do NOT fabricate, invent, or guess. Only return what explicitly appears in the text.
Return strictly a JSON object: { "email": "the_email_found_or_null", "phone": "the_phone_found_or_null" }

Webpage Text:
${strippedText}
`;
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
        } catch (searchError) {
          console.error("DDG Search Error for company:", job.company, searchError);
        }
      }

      // Store whatever we found
      if (foundEmail) job.recipientEmail = foundEmail;
      // Always push the job, even if no email is found, so the user can manually apply
      validJobs.push(job);
    }

    return NextResponse.json({ jobs: validJobs });

  } catch (error: any) {
    console.error("Extraction Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

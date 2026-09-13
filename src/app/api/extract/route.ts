import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const cheerio = require('cheerio');

    // Helper to fetch and parse URL
    async function fetchAndParseUrl(url: string) {
      console.log(`[Extract] Attempting Direct Fetch for URL: ${url}`);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);

          $('script, style, nav, footer, iframe, img, svg').remove();

          const pageTitle = $('title').text().trim();
          const metaDesc = $('meta[name="description"]').attr('content') || '';

          let headings = '';
          $('h1, h2, h3').each((_: any, el: any) => { headings += $(el).text().trim() + '\n'; });

          let bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000);

          console.log(`[Extract] Direct Fetch Successful. Found ${bodyText.length} characters.`);
          return `Title: ${pageTitle}\nDescription: ${metaDesc}\nHeadings: ${headings}\nContent: ${bodyText}`;
        } else {
          console.log(`[Extract] Direct Fetch Failed with status ${res.status}`);
          return null;
        }
      } catch (err: any) {
        console.log(`[Extract] Direct Fetch Failed with error: ${err.message}`);
        return null;
      }
    }

    // Helper for Bing Search fallback
    async function searchBingForCompany(companyName: string) {
      console.log(`[Extract] Initiating Bing Search Fallback for: ${companyName}`);
      try {
        const query = `${companyName} official website careers contact`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=5`;
        const res = await fetch(bingUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);

          let targetUrl: string | null = null;
          $('li.b_algo h2 a').each((_: any, el: any) => {
            if (targetUrl) return;
            let link = $(el).attr('href');
            if (link && link.includes('bing.com/ck/a?!')) {
              try {
                const params = new URL(link).searchParams;
                const encoded = params.get('u');
                if (encoded && encoded.length > 2) {
                  link = Buffer.from(encoded.substring(2), 'base64').toString('utf-8');
                }
              } catch (e) {}
            }
            if (link && link.startsWith('http') && !link.includes('linkedin.com')) {
              targetUrl = link;
            }
          });

          if (targetUrl) {
            console.log(`[Extract] Bing Found URL: ${targetUrl}. Attempting fetch...`);
            const content = await fetchAndParseUrl(targetUrl);
            return { content, url: targetUrl };
          }
        }
      } catch (e: any) {
        console.log(`[Extract] Bing Fallback Failed: ${e.message}`);
      }
      return { content: null, url: null };
    }

    // 1. Process Input Text
    let contentToAnalyze = text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlsInText = text.match(urlRegex);

    // If the user just pasted a single URL
    if (urlsInText && urlsInText.length === 1 && text.trim() === urlsInText[0]) {
      const parsedContent = await fetchAndParseUrl(urlsInText[0]);
      if (parsedContent) {
        contentToAnalyze = parsedContent;
      } else {
        // Direct fetch failed. Try Bing search using domain name
        const domain = new URL(urlsInText[0]).hostname.replace('www.', '');
        const { content } = await searchBingForCompany(domain);
        if (content) {
          contentToAnalyze = content;
        }
      }
    }

    // 2. Gemini Extraction
    const prompt = `
You are a highly capable AI assistant that extracts job details from text. 
The text might be a formal job description, raw webpage text, or a raw, messy WhatsApp chat export containing MULTIPLE job postings.
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
${contentToAnalyze}
`;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      if (!responseText) throw new Error("AI returned empty result");

      const parsed = JSON.parse(responseText);
      let jobs = parsed.jobs || [];

      // 3. Post-Processing for missing emails on Scraper Input
      if (inputType === 'scraper') {
        for (let job of jobs) {
          if (!job.recipientEmail && job.company && job.company !== "Unknown") {
            const { content, url } = await searchBingForCompany(job.company);
            if (content) {
              const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
              const matches = content.match(emailRegex);
              if (matches && matches.length > 0) {
                const valid = matches.filter(e => {
                  const l = e.toLowerCase();
                  return !l.endsWith('.png') && !l.endsWith('.jpg') && !l.includes('example') && !l.includes('sentry');
                });
                if (valid.length > 0) {
                  job.recipientEmail = valid[0];
                  if (url) job.companyWebsite = url;
                  console.log(`[Extract] Bing Fallback found email: ${valid[0]}`);
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ jobs });

    } catch (geminiError: any) {
      console.error(`[Extract] Gemini Quota Exceeded or API Error:`, geminiError);
      if (geminiError.message && geminiError.message.includes('429')) {
        return new NextResponse("Gemini API Quota Exceeded. Please try again later or upgrade your API key.", { status: 429 });
      }
      return new NextResponse(`Gemini AI Error: ${geminiError.message}`, { status: 500 });
    }

  } catch (error: any) {
    console.error("Extraction Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

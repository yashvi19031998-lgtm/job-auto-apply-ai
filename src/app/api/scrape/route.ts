import { NextResponse } from 'next/server';
const google = require('googlethis');

export async function POST(req: Request) {
  try {
    const { keywords, location, searchMode, searchSource } = await req.json();

    if (!keywords) {
      return NextResponse.json({ error: 'Keywords are required' }, { status: 400 });
    }

    let query = "";
    const locString = location ? location : "";

    if (searchSource === "linkedin") {
      query = `site:linkedin.com/jobs/view/ OR site:linkedin.com/jobs/ ${keywords} ${locString} ${searchMode === "freelance" ? "freelance OR contract" : ""}`;
    } else if (searchSource === "naukri") {
      query = `site:naukri.com/job-listings ${keywords} ${locString} ${searchMode === "freelance" ? "freelance OR contract" : ""}`;
    } else if (searchSource === "indeed") {
      query = `site:in.indeed.com/viewjob OR site:indeed.com/viewjob ${keywords} ${locString} ${searchMode === "freelance" ? "freelance OR contract" : ""}`;
    } else {
      // Global Web (Email First fallback)
      if (searchMode === "freelance") {
        query = `"${keywords}" ${locString} ("freelance" OR "contract") "@"`;
      } else {
        query = `"${keywords}" ${locString} ("send your resume to" OR "send resume to" OR "hr@") "@"`;
      }
    }

    if (searchSource === "linkedin") {
      try {
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location || "Worldwide")}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        if (!response.ok) throw new Error("Failed to fetch from LinkedIn");
        
        const html = await response.text();
        const jobs = [];
        
        const liRegex = /<li>([\s\S]*?)<\/li>/g;
        let match;
        
        while ((match = liRegex.exec(html)) !== null && jobs.length < 15) {
          const itemHtml = match[1];
          if (!itemHtml.includes('base-card__full-link')) continue;
          
          const titleMatch = itemHtml.match(/<h3 class="base-search-card__title">\s*(.*?)\s*<\/h3>/);
          const companyMatch = itemHtml.match(/<h4 class="base-search-card__subtitle">[\s\S]*?<a.*?>\s*(.*?)\s*<\/a>/) || itemHtml.match(/<h4 class="base-search-card__subtitle">\s*(.*?)\s*<\/h4>/);
          const locationMatch = itemHtml.match(/<span class="job-search-card__location">\s*(.*?)\s*<\/span>/);
          const urlMatch = itemHtml.match(/<a class="base-card__full-link.*?href="(.*?)"/);
          
          if (titleMatch && urlMatch) {
            jobs.push({
              title: titleMatch[1].trim(),
              company: companyMatch ? companyMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim() : "LinkedIn Job",
              location: locationMatch ? locationMatch[1].trim() : "",
              url: urlMatch[1].split('?')[0],
              snippet: "Directly scraped from LinkedIn. Complete details will be analyzed upon import."
            });
          }
        }
        
        if (jobs.length > 0) {
          return NextResponse.json({ jobs });
        } else {
          return NextResponse.json({ error: 'No jobs found on LinkedIn matching your criteria.' }, { status: 404 });
        }
      } catch (e: any) {
        return NextResponse.json({ error: `LinkedIn Scrape Failed: ${e.message}` }, { status: 500 });
      }
    }

    const safeSearch = async (q: string, retries = 3) => {
      const options = { page: 0, safe: false, additional_params: { hl: 'en' } };
      for (let i = 0; i < retries; i++) {
        try {
          return await google.search(q, options);
        } catch (e: any) {
          if (e.message && e.message.toLowerCase().includes('anomaly')) {
            if (i === retries - 1) throw new Error("Search engine blocked the request (Rate Limit). Please wait a few minutes and try again.");
            await new Promise(r => setTimeout(r, 4000 * (i + 1)));
          } else {
            throw e;
          }
        }
      }
      return { results: [] };
    };

    const searchResults = await safeSearch(query);

    if (!searchResults.results || searchResults.results.length === 0) {
      return NextResponse.json({ error: 'No jobs found matching your criteria.' }, { status: 404 });
    }

    const jobs = searchResults.results.slice(0, 10).map((result: any) => {
      // Normalize URL
      let url = result.url || '';
      if (url.includes('?')) {
        url = url.split('?')[0];
      }

      return {
        title: result.title,
        company: "Unknown (Extracted later)",
        location: location || "Remote/Unknown",
        url: url,
        snippet: result.description,
      };
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: error.message || 'An internal error occurred during scraping.' }, { status: 500 });
  }
}

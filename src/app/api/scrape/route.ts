import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { keywords, location, searchMode, searchSource, timeRange } = await req.json();

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
    } else if (searchSource === "cutshort") {
      query = `site:cutshort.io/job ${keywords} ${locString} ${searchMode === "freelance" ? "freelance OR contract" : ""}`;
    } else if (searchSource === "alignerr") {
      query = `site:app.alignerr.com ${keywords} ${locString} ${searchMode === "freelance" ? "freelance OR contract" : ""}`;
    } else if (searchSource === "custom") {
      query = keywords;
    } else {
      // Global Web Search
      if (searchMode === "freelance") {
        query = `${keywords} ${locString} freelance OR contract remote jobs`;
      } else {
        query = `${keywords} ${locString} job opening careers`;
      }
    }

    if (searchSource === "linkedin") {
      try {
        const jobs: any[] = [];
        const limit = 100;
        let start = 0;
        let timeParam = "";

        if (timeRange === "past_24h") timeParam = "&f_TPR=r86400";
        else if (timeRange === "past_week") timeParam = "&f_TPR=r604800";
        else if (timeRange === "past_month") timeParam = "&f_TPR=r2592000";

        while (jobs.length < limit && start <= 100) {
          const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location || "Worldwide")}${timeParam}&start=${start}`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });

          if (!response.ok) throw new Error("Failed to fetch from LinkedIn");

          const html = await response.text();
          const liRegex = /<li>([\s\S]*?)<\/li>/g;
          let match;
          let foundInBatch = 0;

          while ((match = liRegex.exec(html)) !== null && jobs.length < limit) {
            const itemHtml = match[1];
            if (!itemHtml.includes('base-card__full-link')) continue;

            const titleMatch = itemHtml.match(/<h3 class="base-search-card__title">\s*(.*?)\s*<\/h3>/);
            const companyMatch = itemHtml.match(/<h4 class="base-search-card__subtitle">[\s\S]*?<a.*?>\s*(.*?)\s*<\/a>/) || itemHtml.match(/<h4 class="base-search-card__subtitle">\s*(.*?)\s*<\/h4>/);
            const locationMatch = itemHtml.match(/<span class="job-search-card__location">\s*(.*?)\s*<\/span>/);
            const urlMatch = itemHtml.match(/<a class="base-card__full-link.*?href="(.*?)"/);

            if (titleMatch && urlMatch) {
              const jobUrl = urlMatch[1].split('?')[0];
              if (!jobs.some(j => j.url === jobUrl)) {
                jobs.push({
                  title: titleMatch[1].trim(),
                  company: companyMatch ? companyMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim() : "LinkedIn Job",
                  location: locationMatch ? locationMatch[1].trim() : "",
                  url: jobUrl,
                  snippet: "Directly scraped from LinkedIn. Complete details will be analyzed upon import."
                });
                foundInBatch++;
              }
            }
          }

          if (foundInBatch === 0) break;
          start += 25;
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

    // ==========================================
    // NAUKRI, INDEED, ALIGNERR, CUTSHORT, CUSTOM & WEB
    // Exclusive Bing Search Scraper (No Google, No DDG, No Apify, No Gemini)
    // ==========================================
    const jobs: any[] = [];
    
    try {
      const cheerio = require('cheerio');
      console.log(`[Scrape] Initiating Bing Search for: ${query}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=15`;
      const response = await fetch(bingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml'
        },
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bing returned status ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('li.b_algo').each((i: number, el: any) => {
        if (jobs.length >= 15) return;
        
        const titleEl = $(el).find('h2 a');
        const snippetEl = $(el).find('.b_caption p, .b_algoSlug');
        
        const url = titleEl.attr('href');
        let title = titleEl.text().trim();
        const snippet = snippetEl.text().trim();
        
        if (url && url.startsWith('http') && title) {
          let company = "Unknown Company";
          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            title = parts[0].trim();
            company = parts.slice(1).join(' - ').trim();
          } else if (title.includes(' | ')) {
            const parts = title.split(' | ');
            title = parts[0].trim();
            company = parts.slice(1).join(' | ').trim();
          }
          
          jobs.push({
            title: title || "Unknown Job",
            company: company,
            location: location || "",
            url: url,
            snippet: snippet || "Found via Bing Search",
          });
        }
      });
      
      if (jobs.length === 0) {
        console.warn(`[Scrape] Bing returned 0 valid jobs for query: ${query}`);
        return NextResponse.json({ error: `Bing Search returned 0 results for your query.` }, { status: 404 });
      }

      console.log(`[Scrape] Successfully extracted ${jobs.length} leads from Bing.`);
      return NextResponse.json({ jobs });
      
    } catch (error: any) {
      console.error(`[Scrape] Bing Scrape Failed:`, error.message);
      return NextResponse.json({ error: `Web Scrape Failed. Bing Error: ${error.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: error.message || 'An internal error occurred during scraping.' }, { status: 500 });
  }
}

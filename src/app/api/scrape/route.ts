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
    // NAUKRI IMPLEMENTATION
    // ==========================================
    if (searchSource === "naukri") {
      try {
        // Direct fetching Naukri usually results in a 403 Forbidden or requires JS execution (Datadome/Cloudflare)
        // Implementing a lightweight fetch to check if it's reachable from the cloud IP.
        const url = `https://www.naukri.com/${keywords.replace(/\s+/g, '-')}-jobs-in-${location ? location.replace(/\s+/g, '-') : 'anywhere'}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'text/html,application/xhtml+xml,application/xml'
          }
        });
        
        if (!response.ok) {
           return NextResponse.json({ 
             error: `Naukri blocked the automated request (HTTP ${response.status}). Naukri requires browser execution or residential proxies which are unavailable in this serverless environment. Please use LinkedIn.` 
           }, { status: 403 });
        }
        
        const html = await response.text();
        // Naukri HTML is mostly SPA (Single Page Application). We extract from the preloaded state if available.
        const jobs: any[] = [];
        const stateMatch = html.match(/window\.PRELOADED_STATE\s*=\s*(\{.*?\});/);
        
        if (stateMatch && stateMatch[1]) {
           const state = JSON.parse(stateMatch[1]);
           const jobList = state?.searchData?.jobList || [];
           
           for (const job of jobList) {
             if (jobs.length >= 10) break;
             jobs.push({
                title: job.title || "Unknown Title",
                company: job.companyName || "Unknown Company",
                location: job.placeholders?.find((p: any) => p.type === 'location')?.label || location,
                url: job.jdURL || `https://www.naukri.com/job-listings-${job.jobId}`,
                snippet: job.jobDescription || "Fetched from Naukri"
             });
           }
        }
        
        if (jobs.length > 0) return NextResponse.json({ jobs });
        return NextResponse.json({ error: 'No jobs found on Naukri (or the page structure blocked extraction). Please use LinkedIn.' }, { status: 404 });
      } catch (e: any) {
        return NextResponse.json({ error: `Naukri Scrape Failed: ${e.message}` }, { status: 500 });
      }
    }

    // ==========================================
    // INDEED IMPLEMENTATION
    // ==========================================
    if (searchSource === "indeed") {
       // Indeed uses aggressive Cloudflare protection which blocks standard fetches from AWS/Vercel with 403
       return NextResponse.json({ 
         error: `Indeed actively blocks automated cloud requests via Cloudflare. A premium proxy or local browser instance is required to bypass this, which is unsupported in this Vercel environment. Please use LinkedIn.` 
       }, { status: 403 });
    }

    // ==========================================
    // WEB & CUSTOM IMPLEMENTATION (DuckDuckGo HTML Scraping)
    // ==========================================
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(ddgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });

      if (!response.ok) {
        return NextResponse.json({ error: `Web Search blocked by provider (HTTP ${response.status}). Rate Limit exceeded.` }, { status: 429 });
      }

      const html = await response.text();
      
      // If DDG threw an anomaly or captcha, the HTML won't have standard results
      if (html.includes("If this error persists, please let us know")) {
        return NextResponse.json({ error: 'Search engine anomaly detected. Your server IP is temporarily rate-limited. Please use LinkedIn.' }, { status: 429 });
      }

      const jobs: any[] = [];
      const resultRegex = /<a class="result__url" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      
      while ((match = resultRegex.exec(html)) !== null && jobs.length < 10) {
        let rawUrl = match[1];
        let title = match[2].replace(/<[^>]*>?/gm, '').trim();
        const snippet = match[3].replace(/<[^>]*>?/gm, '').trim();
        
        // 1. Clean the DuckDuckGo tracking URL
        let cleanUrl = rawUrl;
        if (rawUrl.includes('uddg=')) {
           try {
             const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
             if (uddgMatch && uddgMatch[1]) {
                cleanUrl = decodeURIComponent(uddgMatch[1]);
             }
           } catch(e) {}
        } else if (rawUrl.startsWith('//')) {
           cleanUrl = 'https:' + rawUrl;
        }

        // Validate HTTP/HTTPS
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
           continue; // Reject malformed URLs
        }

        // Prevent exact duplicates
        if (jobs.some(j => j.url === cleanUrl)) {
           continue;
        }
        
        // 2. Improve Title and Company Parsing
        let company = "";
        let finalTitle = title;
        
        if (title.includes(' - ')) {
           const parts = title.split(' - ');
           finalTitle = parts[0].trim();
           company = parts.slice(1).join(' - ').trim();
        } else if (title.includes(' | ')) {
           const parts = title.split(' | ');
           finalTitle = parts[0].trim();
           company = parts.slice(1).join(' | ').trim();
        }
        
        if (finalTitle && cleanUrl) {
          jobs.push({
            title: finalTitle,
            company: company,
            location: location || "",
            url: cleanUrl,
            snippet: snippet,
          });
        }
      }

      if (jobs.length > 0) {
        return NextResponse.json({ jobs });
      } else {
        return NextResponse.json({ error: 'No jobs found matching your web search criteria.' }, { status: 404 });
      }

    } catch (e: any) {
      return NextResponse.json({ error: `Web Search Failed: ${e.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: error.message || 'An internal error occurred during scraping.' }, { status: 500 });
  }
}

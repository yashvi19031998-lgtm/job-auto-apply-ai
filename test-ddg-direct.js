const cheerio = require('cheerio');

async function test() {
  const query = "site:naukri.com/job-listings React Developer Remote";
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    const html = await res.text();
    console.log("DDG length:", html.length);
    
    // Quick regex to extract links
    const matches = [...html.matchAll(/<a class="result__url" href="([^"]+)">([^<]+)<\/a>/g)];
    console.log("Found urls:", matches.length);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();

async function test() {
  const query = "React Developer Remote";
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
        console.log("Error status:", response.status);
        return;
      }

      const html = await response.text();
      const jobs = [];
      const resultRegex = /<a class="result__url" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      
      while ((match = resultRegex.exec(html)) !== null && jobs.length < 10) {
        const url = match[1];
        const title = match[2].replace(/<[^>]*>?/gm, '').trim();
        const snippet = match[3].replace(/<[^>]*>?/gm, '').trim();
        
        if (title && url) {
          jobs.push({
            title: title,
            url: url,
            snippet: snippet,
          });
        }
      }
      console.log("Jobs found:", jobs.length);
      console.log(jobs.slice(0, 2));
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();

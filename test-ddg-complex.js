async function test() {
  const query = `"React Developer" Ahmedabad ("hiring" OR "job opening" OR "careers")`;
  try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(ddgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });

      const html = await response.text();
      console.log("HTML length:", html.length);
      const jobs = [];
      const resultRegex = /<a class="result__url" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      
      while ((match = resultRegex.exec(html)) !== null && jobs.length < 10) {
        jobs.push(match[1]);
      }
      console.log("Jobs found:", jobs.length);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();

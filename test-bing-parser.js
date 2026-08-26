async function test() {
  const query = "React Developer Remote hiring";
  const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  
  const results = [];
  const regex = /<li class="b_algo".*?<h2><a href="([^"]+)".*?>(.*?)<\/a>.*?<p[^>]*>(.*?)<\/p>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    // Basic cleanup
    const url = match[1];
    const title = match[2].replace(/<[^>]*>?/gm, '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
    const snippet = match[3].replace(/<[^>]*>?/gm, '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
    results.push({ url, title, snippet });
  }
  
  console.log("Bing results:", results.length);
  console.log(results.slice(0, 2));
}
test();

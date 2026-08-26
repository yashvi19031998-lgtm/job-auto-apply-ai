async function test() {
  const query = "GINN TECHLABS official website contact";
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  const html = await res.text();
  console.log("HTML length:", html.length);
  const links = [...html.matchAll(/class=['"]result__url['"][^>]*href=(["'])(.*?)\1/gi)].map(m => m[2]);
  if (links.length > 0) {
      console.log("Found links:", links);
  } else {
      console.log("No links. Title:", html.match(/<title>(.*?)<\/title>/i)?.[1]);
  }
}
test();

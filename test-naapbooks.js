async function test() {
  const query = "Naapbooks Limited official website contact";
  const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: `q=${encodeURIComponent(query)}`
  });
  const html = await ddgRes.text();
  const urlMatches = [...html.matchAll(/href=(["'])(.*?)\1/gi)].map(m => m[2]);
  const links = urlMatches.filter(u => u.startsWith('http') && !u.includes('duckduckgo') && !u.includes('w3.org'));
  console.log("Found links:", links.slice(0, 5));
}
test();

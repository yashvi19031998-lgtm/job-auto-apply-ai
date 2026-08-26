async function test() {
  const query = "React Developer Remote hiring";
  const res = await fetch(`https://in.search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  console.log("Status:", res.status);
  const html = await res.text();
  console.log("HTML length:", html.length);
  // regex to find search result titles in yahoo
  const matches = [...html.matchAll(/<h3 class="title"><a[^>]*>(.*?)<\/a>/gi)];
  console.log("Found titles:", matches.length);
}
test();

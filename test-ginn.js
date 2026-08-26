async function test() {
  const query = "GINN TECHLABS official website contact";
  const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: `q=${encodeURIComponent(query)}`
  });
  const html = await ddgRes.text();
  require('fs').writeFileSync('test-html.html', html);
  console.log("Wrote to test-html.html. Length:", html.length);
}
test();

async function test() {
  const query = "Unicorn Infotech Consulting Services email";
  const res = await fetch('https://lite.duckduckgo.com/lite/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: `q=${encodeURIComponent(query)}`
  });
  const html = await res.text();
  console.log("HTML length:", html.length);
  // extract snippets
  const snippets = [];
  const regex = /<tr class='[^']*'>\s*<td class='[^']*'>([\s\S]*?)<\/td>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
     snippets.push(match[1].replace(/<[^>]*>?/gm, ' '));
  }
  console.log(snippets);
}
test();

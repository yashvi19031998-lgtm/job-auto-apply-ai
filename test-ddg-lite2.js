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
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log("Extracted Text:", text.substring(0, 2000));
}
test();

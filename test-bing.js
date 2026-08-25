async function test() {
  const query = "Unicorn Infotech Consulting Services contact email";
  const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  console.log("HTML length:", html.length);
  // extract emails
  const emails = html.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
  console.log("Emails:", [...new Set(emails)]);
  // extract phone numbers (simple regex)
  const phones = html.match(/\+91\s?\d{10}/gi);
  console.log("Phones:", [...new Set(phones)]);
}
test();

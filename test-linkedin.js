async function test() {
  const keywords = "Developer";
  const location = "Remote";
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await response.text();
  console.log("HTML length:", html.length);
  const jobs = [];
  const liRegex = /<li>([\s\S]*?)<\/li>/g;
  let match;
  while ((match = liRegex.exec(html)) !== null && jobs.length < 5) {
    const itemHtml = match[1];
    if (!itemHtml.includes('base-card__full-link')) continue;
    
    const titleMatch = itemHtml.match(/<h3 class="base-search-card__title">\s*(.*?)\s*<\/h3>/);
    const urlMatch = itemHtml.match(/<a class="base-card__full-link.*?href="(.*?)"/);
    if (titleMatch && urlMatch) {
      jobs.push(titleMatch[1].trim());
    }
  }
  console.log("Jobs found:", jobs);
}
test();

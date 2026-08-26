const cheerio = require('cheerio');
async function test() {
  const query = "React Developer Remote hiring";
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const results = [];
  $('.result').each((i, el) => {
    const title = $(el).find('.result__title').text().trim();
    const url = $(el).find('.result__url').attr('href');
    const snippet = $(el).find('.result__snippet').text().trim();
    if (title && url) {
      results.push({ title, url, snippet });
    }
  });
  console.log("DDG results:", results.length);
  console.log(results.slice(0, 2));
}
test();

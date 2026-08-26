const { search, SafeSearchType } = require('duck-duck-scrape');

async function test() {
  const query = "React Developer Remote hiring";
  try {
    const searchResults = await search(query, {
      safeSearch: SafeSearchType.OFF
    });
    console.log("DDG package results:", searchResults.results.length);
    console.log(searchResults.results.slice(0, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

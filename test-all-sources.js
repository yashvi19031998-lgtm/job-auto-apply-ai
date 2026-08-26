async function testSources() {
  const sources = ['linkedin', 'naukri', 'indeed', 'web', 'custom'];
  const payloadBase = {
    keywords: 'React Developer',
    location: 'Ahmedabad',
    searchMode: 'fulltime',
    timeRange: 'past_week'
  };

  const results = {};

  for (const source of sources) {
    console.log(`\nTesting source: ${source}...`);
    try {
      const res = await fetch('http://localhost:3000/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payloadBase, searchSource: source })
      });
      
      const status = res.status;
      const json = await res.json();
      
      results[source] = { status, json };
      console.log(`HTTP ${status} | Jobs: ${json.jobs?.length || 0}`);
      if (json.jobs && json.jobs.length > 0) {
        console.log(`First 3 Titles:`);
        json.jobs.slice(0, 3).forEach((j, i) => console.log(`  ${i+1}. ${j.title} (${j.url.substring(0, 50)}...)`));
      } else if (json.error) {
        console.log(`Error: ${json.error}`);
      }
    } catch (e) {
      console.log(`Error connecting to local server: ${e.message}`);
      results[source] = { error: e.message };
    }
  }
}
testSources();

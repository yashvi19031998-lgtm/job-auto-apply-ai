async function test() {
  const query = "GINN TECHLABS";
  const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
  const data = await res.json();
  console.log("DDG API:", data.AbstractURL, data.Results);
}
test();

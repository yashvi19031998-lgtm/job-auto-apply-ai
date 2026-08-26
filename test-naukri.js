async function test() {
  const res = await fetch("https://www.naukri.com/react-jobs?k=react", {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log("Status:", res.status);
  const html = await res.text();
  console.log("Length:", html.length);
  if (html.includes("Job Tuple")) {
    console.log("Has jobs");
  } else {
    console.log("No jobs maybe blocked");
  }
}
test();

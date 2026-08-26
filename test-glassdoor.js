async function test() {
  const res = await fetch("https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=react", {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  console.log("Status:", res.status);
  console.log("Length:", html.length);
  if (html.includes("Cloudflare") || html.includes("captcha") || html.includes("Datadome")) {
    console.log("Blocked by captcha/datadome");
  } else {
    console.log("Not blocked");
  }
}
test();

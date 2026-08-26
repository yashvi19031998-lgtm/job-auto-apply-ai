async function test() {
  try {
    const resN = await fetch('https://www.naukri.com/react-developer-jobs', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    console.log("Naukri Status:", resN.status);
    
    const resI = await fetch('https://in.indeed.com/jobs?q=react+developer', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    console.log("Indeed Status:", resI.status);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();

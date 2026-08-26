const fs = require('fs');

async function test() {
  try {
    const res = await fetch('https://www.naukri.com/react-developer-jobs', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json' // Naukri sometimes returns JSON for its job API
      }
    });
    const text = await res.text();
    fs.writeFileSync('naukri.html', text);
    console.log("Naukri length:", text.length);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();

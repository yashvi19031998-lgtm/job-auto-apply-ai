require("dotenv").config({ path: ".env.local" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const job = { company: "Naapbooks Limited", alternateContact: "" };
  let foundEmail = null;

  try {
    const query = `${job.company} official website contact`;
    const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: `q=${encodeURIComponent(query)}`
    });
    
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      const urlMatches = [...html.matchAll(/href=(["'])(.*?)\1/gi)].map(m => m[2]);
      const links = urlMatches.filter(u => u.startsWith('http') && !u.includes('duckduckgo') && !u.includes('w3.org') && !u.includes('linkedin.com') && !u.includes('glassdoor'));
      let targetUrl = links.length > 0 ? links[0] : "";
      
      console.log("Target URL found:", targetUrl);
      
      if (targetUrl) {
        // Now fetch the contact page
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const pageRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: controller.signal
        }).catch((e) => {
           console.log("Fetch Error:", e.message);
           return null;
        });
        clearTimeout(timeoutId);

        if (pageRes && pageRes.ok) {
          const pageHtml = await pageRes.text();
          const strippedText = pageHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                   .replace(/<[^>]+>/g, ' ')
                                   .replace(/\s+/g, ' ')
                                   .substring(0, 15000);

          console.log("Stripped Text Length:", strippedText.length);
          const pagePrompt = `
Extract the official company email address AND contact phone number from the following webpage text. 
Do NOT fabricate, invent, or guess. Only return what explicitly appears in the text.
Return strictly a JSON object: { "email": "the_email_found_or_null", "phone": "the_phone_found_or_null" }

Webpage Text:
${strippedText}
`;
          const pageResult = await model.generateContent(pagePrompt);
          const pageParsed = JSON.parse(pageResult.response.text());
          
          console.log("AI Result:", pageParsed);
        } else {
          console.log("Page Res was not OK or null");
        }
      }
    }
  } catch (e) {
    console.error("DDG Search Error:", e);
  }
}
test();

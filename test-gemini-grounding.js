require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [
      {
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.3,
          },
        },
      }
    ]
  });

  try {
    const result = await model.generateContent("Find me 5 remote React Developer job postings from the last 24 hours. Return them as JSON: [{title, company, url, snippet}]");
    console.log("Response:", result.response.text());
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();

require("dotenv").config({ path: ".env.local" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    tools: [{ googleSearch: {} }]
  });

  try {
    const res = await model.generateContent("Find me 1 latest React Developer job posted on LinkedIn in Remote location. Output the URL and Title in JSON.");
    console.log(res.response.text());
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

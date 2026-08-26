require("dotenv").config({ path: ".env.local" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
  });

  try {
    const prompt = `Given the company name "GINN TECHLABS", guess the 5 most likely official website URLs for them. Return ONLY a JSON object: { "urls": ["url1", "url2", ...] }`;
    const res = await model.generateContent(prompt);
    console.log(res.response.text());
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

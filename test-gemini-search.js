const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    tools: [{ googleSearch: {} }],
  });

  const prompt = `Find the official contact email address AND phone number for the company "Unicorn Infotech Consulting Services". Return ONLY JSON: {"email": "...", "phone": "..."}`;
  try {
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

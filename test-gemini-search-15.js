require("dotenv").config({ path: ".env.local" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [{ googleSearch: {} }]
  });

  try {
    const res = await model.generateContent("What is the official website URL of GINN TECHLABS?");
    console.log(res.response.text());
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

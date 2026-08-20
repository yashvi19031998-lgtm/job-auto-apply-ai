import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new NextResponse("Missing job text", { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse("GEMINI_API_KEY is not configured", { status: 500 });
    }

    const prompt = `
You are a highly capable AI assistant that extracts job details from text. 
The text might be a formal job description OR a raw, messy WhatsApp chat export containing MULTIPLE job postings.
Extract ALL distinct job postings found in the text. Ignore irrelevant chat messages, greetings, and spam.

Required JSON format:
{
  "jobs": [
    {
      "jobTitle": "String or null",
      "company": "String or null",
      "recruiterName": "String or null",
      "recipientEmail": "String or null (Must be a valid email format)",
      "alternateContact": "String or null (Extract WhatsApp number, LinkedIn link, or form link if email is NOT found)",
      "requirements": "A concise bulleted list string of key skills and responsibilities."
    }
  ]
}

Text to process:
${text}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) throw new Error("AI returned empty result");

    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      jobs: parsed.jobs || []
    });

  } catch (error: any) {
    console.error("Extraction Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

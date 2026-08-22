import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Signature, WorkingWebsite } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { jobDetails, signature, resumeBase64, websites } = await req.json();

    if (!jobDetails || !signature) {
      return new NextResponse("Missing details", { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse("GEMINI_API_KEY is not configured", { status: 500 });
    }

    let resumeText = "";
    if (resumeBase64) {
      try {
        const pdfParse = require("pdf-parse");
        const base64Data = resumeBase64.split(";base64,").pop();
        const buffer = Buffer.from(base64Data, "base64");
        const pdfData = await pdfParse(buffer);
        resumeText = pdfData.text;
      } catch (e) {
        console.error("Failed to parse resume", e);
        resumeText = "Could not parse resume.";
      }
    }

    const websitesText = (websites as WorkingWebsite[])
      .map(w => `ID: ${w.id} | Name: ${w.name} | URL: ${w.url} | Description: ${w.description}`)
      .join("\n");

    const prompt = `
You are an expert career coach and professional application writer.
Generate a tailored job application email. Do NOT hallucinate skills not in the resume. 
Keep it professional, human-sounding, and concise. Do NOT be overly generic.

Job Title: ${jobDetails.title || "Not specified"}
Company: ${jobDetails.company || "Not specified"}
Job Requirements:
${jobDetails.requirements || "Not specified"}

My Resume:
${resumeText}

My Signature Information:
Name: ${signature.fullName}
Email: ${signature.email}
Phone: ${signature.phone}
Location: ${signature.location}
Portfolio: ${signature.portfolioUrl}
LinkedIn: ${signature.linkedinUrl || "Not provided"}

My Working Projects/Websites:
${websitesText}

Instructions:
1. Extract specific skills and experiences from My Resume that perfectly match the Job Requirements. 
2. Explicitly highlight these matching skills in the Email Body to demonstrate exactly why I am a strong fit for this role.
3. Explicitly mention that I am an "Immediate Joiner" and ready to start right away.
4. Make the email highly impressive, persuasive, and compelling so that the hiring team is extremely impressed and wants to call me immediately.
5. Select the ONE most relevant Working Project/Website from the list above. If none fit well, leave it out.
6. Generate a professional Subject line.
7. Generate the Email Body incorporating the matching skills, the immediate joiner status, and the selected website (if applicable). Sign off professionally using my Signature Information.
8. Output as a JSON object with strictly these keys:
{
  "subject": "String",
  "body": "String",
  "selectedWebsiteId": "String (the ID of the selected website, or null if none selected)"
}
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

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Generation Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

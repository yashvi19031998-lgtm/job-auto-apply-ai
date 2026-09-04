import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Signature, WorkingWebsite } from "@/types";

// Polyfill DOMMatrix for pdf-parse in newer Node versions
if (typeof global !== "undefined" && !global.DOMMatrix) {
  global.DOMMatrix = class DOMMatrix {} as any;
}
if (typeof global !== "undefined" && !global.ImageData) {
  global.ImageData = class ImageData {} as any;
}
if (typeof global !== "undefined" && !global.Path2D) {
  global.Path2D = class Path2D {} as any;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { jobDetails, signature, resumeBase64, websites, jobType } = await req.json();

    if (!jobDetails || !signature) {
      return new NextResponse("Missing details", { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse("GEMINI_API_KEY is not configured", { status: 500 });
    }

    let resumeText = "";
    if (resumeBase64) {
      try {
        const pdfParseModule = require("pdf-parse");
        let pdfParse = pdfParseModule.default || pdfParseModule.PDFParse;
        if (typeof pdfParse !== "function" && typeof pdfParseModule === "function") {
          pdfParse = pdfParseModule;
        }
        if (!pdfParse) throw new Error("Could not find PDF parsing function in pdf-parse module.");
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

    const modeInstructions = `You are an expert career coach, professional application writer, and consultant.
Generate a tailored job application or proposal email. Do NOT hallucinate skills not in your resume.
3. Carefully analyze the Job Title and Requirements. 
4. IF the job is explicitly a freelance, contract, or part-time role: You MUST state that you are a freelancer/contractor, your price is 450/- Rs. per hour, and you deliver fast work.
5. IF the job is a full-time or permanent role: DO NOT mention freelancing, contract work, or hourly rates. Explicitly mention that you are an "Immediate Joiner" and ready to start right away.`;

    const prompt = `
${modeInstructions}
Keep it professional, human-sounding, and concise. Do NOT be overly generic.

Job Title/Project: ${jobDetails.title || "Not specified"}
Company/Client: ${jobDetails.company || "Not specified"}
Requirements/Details:
${jobDetails.requirements || "Not specified"}

My Resume/Profile:
${resumeText}
(Mention that my resume is attached for their reference).

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
1. Extract specific skills and experiences from My Resume that perfectly match the Requirements. 
2. Explicitly highlight these matching skills in the Email Body to demonstrate exactly why I am a strong fit.
4. Make the email highly impressive, persuasive, and compelling so that the client/hiring team is extremely impressed.
5. You MUST include ALL the Working Projects/Websites provided above in the email body as examples of your work.
6. Generate a professional Subject line.
7. Generate the Email Body incorporating the matching skills, the immediate joiner status, and ALL the Working Projects/Websites. Sign off professionally, and you MUST include ALL my Signature Information (Name, Email, Phone, Location, Portfolio, LinkedIn) at the end.
8. Output as a JSON object with strictly these keys:
{
  "subject": "String",
  "body": "String",
  "selectedWebsiteId": "String (the ID of the primary website, or null)",
  "matchScore": "Number (0 to 100, representing the percentage match between the job requirements and the resume skills)"
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

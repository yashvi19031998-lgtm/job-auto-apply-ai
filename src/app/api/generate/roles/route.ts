import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { resumeText, location } = await req.json();

    if (!resumeText) {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const prompt = `
You are an expert career counselor and recruitment AI.
Analyze the following resume and location, and return EXACTLY 7 highly targeted Job Search Roles/Titles that this candidate should search for.
These should be optimized for search engines (e.g., LinkedIn, Indeed) to yield the best freelance, contract, or full-time matches.
Return ONLY a valid JSON array of 7 strings. Do not include markdown code blocks, just the JSON array.

Location: ${location || 'Worldwide'}
Resume Text:
${resumeText.substring(0, 5000)}
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Clean up markdown if any
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let roles: string[];
    try {
      roles = JSON.parse(text);
      if (!Array.isArray(roles)) throw new Error("Not an array");
    } catch (e) {
      console.error("Failed to parse AI output:", text);
      return NextResponse.json({ error: 'Failed to generate valid JSON array of roles' }, { status: 500 });
    }

    // Ensure we have exactly 7, or pad/truncate
    let finalRoles = roles.filter(r => typeof r === 'string' && r.trim().length > 0);
    if (finalRoles.length > 7) finalRoles = finalRoles.slice(0, 7);
    while (finalRoles.length < 7) {
      finalRoles.push(`Software Professional ${finalRoles.length + 1}`);
    }

    return NextResponse.json({ roles: finalRoles });
  } catch (error: any) {
    console.error("Roles generation error:", error);
    return NextResponse.json({ error: error.message || 'An internal error occurred.' }, { status: 500 });
  }
}

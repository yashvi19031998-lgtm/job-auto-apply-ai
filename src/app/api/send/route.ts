import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, resumeBase64, resumeName } = await req.json();

    if (!to || !subject || !body) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const attachments = [];
    
    if (resumeBase64 && resumeName) {
      const base64Data = resumeBase64.split(";base64,").pop();
      const buffer = Buffer.from(base64Data, "base64");
      
      attachments.push({
        filename: resumeName,
        content: buffer,
        contentType: "application/pdf"
      });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject,
      text: body,
      attachments,
    });

    return NextResponse.json({ success: true, message: "Email sent" });
    
  } catch (error: any) {
    console.error("Email Error:", error);
    return new NextResponse(error.message || "Failed to send email", { status: 500 });
  }
}

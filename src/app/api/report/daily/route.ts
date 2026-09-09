import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic'; // Ensure this route is not statically cached

export async function GET(req: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const leadsPath = path.join(dataDir, "auto_scout_leads.json");

    if (!fs.existsSync(leadsPath)) {
      return new NextResponse("Leads data not found", { status: 404 });
    }

    const leads = JSON.parse(fs.readFileSync(leadsPath, "utf8"));
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Filter leads from the last 24 hours
    const recentLeads = leads.filter((lead: any) => {
      // Prefer appliedAt for sent applications, fallback to firstSeenAt
      const timestamp = lead.appliedAt || lead.firstSeenAt;
      return timestamp && (now - timestamp) <= ONE_DAY_MS;
    });

    // 1. Successfully Sent Applications
    const sentApplications = recentLeads.filter((lead: any) => 
      (lead.status === "applied" || lead.status === "sent") && lead.recipientEmail
    );

    // 2. Link-Only Jobs (No Email Found)
    const linkOnlyJobs = recentLeads.filter((lead: any) => 
      (lead.status === "no_email" || !lead.recipientEmail) && lead.jobUrl
    );

    // Prepare Email Content
    const reportDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Job Auto-Apply Daily Report
        </h2>
        <p style="color: #6b7280; font-size: 14px;">Date: ${reportDate}</p>
    `;

    if (sentApplications.length === 0 && linkOnlyJobs.length === 0) {
      emailHtml += `
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="margin-top: 0;">No Activity Today</h3>
          <p>No new applications were sent, and no new link-only jobs were discovered in the last 24 hours.</p>
        </div>
      `;
    } else {
      // Sent Applications Section
      emailHtml += `
        <div style="margin-top: 30px;">
          <h3 style="background-color: #dcfce7; color: #166534; padding: 10px 15px; border-radius: 6px;">
            ✅ Successfully Sent Applications (${sentApplications.length})
          </h3>
      `;
      
      if (sentApplications.length > 0) {
        emailHtml += `<ul style="list-style-type: none; padding-left: 0;">`;
        sentApplications.forEach((job: any) => {
          emailHtml += `
            <li style="margin-bottom: 15px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px;">
              <strong style="font-size: 16px; color: #111827;">${job.jobTitle || 'Unknown Title'}</strong> at <strong>${job.company || 'Unknown Company'}</strong><br/>
              <span style="color: #4b5563; font-size: 14px;">Sent to: <a href="mailto:${job.recipientEmail}" style="color: #2563eb;">${job.recipientEmail}</a></span><br/>
              ${job.jobUrl ? `<span style="font-size: 13px;"><a href="${job.jobUrl}" style="color: #6b7280; text-decoration: none;">🔗 View Job Posting</a></span>` : ''}
            </li>
          `;
        });
        emailHtml += `</ul>`;
      } else {
        emailHtml += `<p style="color: #6b7280; font-style: italic;">No emails were sent today.</p>`;
      }
      emailHtml += `</div>`;

      // Link-Only Jobs Section
      emailHtml += `
        <div style="margin-top: 30px;">
          <h3 style="background-color: #fef9c3; color: #854d0e; padding: 10px 15px; border-radius: 6px;">
            🔗 Link-Only Jobs to Review (${linkOnlyJobs.length})
          </h3>
          <p style="font-size: 14px; color: #6b7280;">No email address was found for these jobs. Please review and apply manually if interested.</p>
      `;
      
      if (linkOnlyJobs.length > 0) {
        emailHtml += `<ul style="list-style-type: none; padding-left: 0;">`;
        linkOnlyJobs.forEach((job: any) => {
          emailHtml += `
            <li style="margin-bottom: 15px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px;">
              <strong style="font-size: 16px; color: #111827;">${job.jobTitle || 'Unknown Title'}</strong> at <strong>${job.company || 'Unknown Company'}</strong><br/>
              ${job.jobUrl ? `<a href="${job.jobUrl}" style="display: inline-block; margin-top: 8px; background-color: #2563eb; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: bold;">Apply Manually</a>` : '<span style="color: red;">No URL provided</span>'}
            </li>
          `;
        });
        emailHtml += `</ul>`;
      } else {
        emailHtml += `<p style="color: #6b7280; font-style: italic;">No link-only jobs found today.</p>`;
      }
      emailHtml += `</div>`;
    }

    emailHtml += `
      <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>This is an automated report generated by your Job Auto-Apply AI System.</p>
      </div>
      </div>
    `;

    // Configure Nodemailer
    const userEmail = process.env.SMTP_USER;
    if (!userEmail) {
      throw new Error("SMTP_USER is not configured in .env.local");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: userEmail,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send the email to the SMTP_USER
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || userEmail,
      to: userEmail, // Send to self
      subject: `Daily Auto-Scout Report: ${sentApplications.length} Sent, ${linkOnlyJobs.length} Links Found`,
      html: emailHtml,
    });

    console.log(`[Report] Successfully sent daily report to ${userEmail}`);
    return NextResponse.json({ 
      success: true, 
      sentApplications: sentApplications.length, 
      linkOnlyJobs: linkOnlyJobs.length 
    });

  } catch (error: any) {
    console.error("[Report] Error sending daily report:", error);
    return new NextResponse(error.message || "Failed to send report", { status: 500 });
  }
}

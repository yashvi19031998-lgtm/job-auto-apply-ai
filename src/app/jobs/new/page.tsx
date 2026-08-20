"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { FileText, MessageSquare, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = 25000 } = options;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return fetch(resource, {
    ...options,
    signal: controller.signal
  });
}

export default function NewJobPage() {
  const router = useRouter();
  const { addJob, updateJob, signature, resume, websites, jobs } = useAppStore();

  // Automatic Memory Cleanup: Fix older jobs that took up too much space
  useEffect(() => {
    let changed = false;
    const cleanedJobs = jobs.map(j => {
      if (j.originalInput && j.originalInput.length > 1000) {
        changed = true;
        return { ...j, originalInput: "Cleaned up to save memory." };
      }
      return j;
    });
    if (changed) {
      useAppStore.setState({ jobs: cleanedJobs });
    }
  }, [jobs]);

  const [inputType, setInputType] = useState<"text" | "file" | null>(null);
  const [jobText, setJobText] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Automation Progress State
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleProcess = async () => {
    const content = inputType === "text" ? jobText : fileContent;
    if (!content.trim()) {
      setError("Please provide job details.");
      return;
    }

    if (!signature || !resume) {
      setError("Please complete setup (Signature & Resume) before extracting.");
      return;
    }

    setLoading(true);
    setError("");
    setLogs([]);

    try {
      addLog("🔍 Analyzing text and extracting job postings...");

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const extractedJobs = data.jobs || [];
      if (extractedJobs.length === 0) {
        throw new Error("No job postings found in the text.");
      }

      addLog(`✅ Found ${extractedJobs.length} job posting(s). Starting automation...`);
      setProgress({ current: 0, total: extractedJobs.length });

      for (let i = 0; i < extractedJobs.length; i++) {
        const jobData = extractedJobs[i];
        setProgress(p => ({ ...p, current: i + 1 }));

        const jobTitleStr = jobData.jobTitle || `Job #${i + 1}`;
        const companyStr = jobData.company || "Unknown Company";
        addLog(`\n⚙️ Processing: ${jobTitleStr} at ${companyStr}`);

        // Duplicate Check (Check by email OR by job title + company)
        const isDuplicate = jobs.some(j => {
          if (j.status !== "sent" && j.status !== "generated" && j.status !== "draft") return false;

          const sameEmail = jobData.recipientEmail && j.recipientEmail
            ? j.recipientEmail.toLowerCase().trim() === jobData.recipientEmail.toLowerCase().trim()
            : false;

          const sameTitleAndCompany = jobData.jobTitle && j.jobTitle && jobData.company && j.company
            ? j.jobTitle.toLowerCase().trim() === jobData.jobTitle.toLowerCase().trim() &&
            j.company.toLowerCase().trim() === jobData.company.toLowerCase().trim()
            : false;

          return sameEmail || sameTitleAndCompany;
        });

        if (isDuplicate) {
          addLog(`   ⏭️ Skipped: Job already processed previously.`);
          // Yield to UI thread before continuing
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Add 4-second delay BEFORE generating to respect Gemini's 15 RPM free tier limit
        // and allow the browser UI to update without freezing.
        await new Promise(resolve => setTimeout(resolve, 4000));

        // 1. Create Draft
        const jobId = addJob({
          inputSource: inputType!,
          originalInput: inputType === "file" ? `Uploaded File: ${fileName}` : content.substring(0, 500) + (content.length > 500 ? "..." : ""),
          status: "draft",
          jobTitle: jobData.jobTitle,
          company: jobData.company,
          recipientEmail: jobData.recipientEmail,
          alternateContact: jobData.alternateContact,
          recruiterName: jobData.recruiterName,
          requirements: jobData.requirements,
        });

        // 2. Generate Email
        let generatedSub = "";
        let generatedBod = "";
        let selectedWebId = "";

        if (jobData.recipientEmail) {
          addLog(`   🧠 Generating tailored AI email...`);
          try {
            const genRes = await fetchWithTimeout("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jobDetails: {
                  title: jobData.jobTitle,
                  company: jobData.company,
                  requirements: jobData.requirements
                },
                signature,
                resumeBase64: resume.base64Data,
                websites
              })
            });

            if (!genRes.ok) throw new Error(await genRes.text());
            const genData = await genRes.json();

            generatedSub = genData.subject;
            generatedBod = genData.body;
            selectedWebId = genData.selectedWebsiteId;

            updateJob(jobId, {
              generatedSubject: generatedSub,
              generatedBody: generatedBod,
              selectedWebsiteId: selectedWebId,
              status: "generated"
            });

            addLog(`   ✅ Email generated successfully.`);
          } catch (e: any) {
            addLog(`   ❌ Failed to generate email: ${e.message}`);
            continue; // Skip sending if generation failed
          }
        } else {
          addLog(`   ⏭️ Skipped AI Email Generation (No email address provided).`);
        }

        // 3. Send Email (if email exists)
        if (jobData.recipientEmail && generatedSub && generatedBod) {
          addLog(`   📧 Sending email to ${jobData.recipientEmail}...`);
          try {
            const sendRes = await fetchWithTimeout("/api/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: jobData.recipientEmail,
                subject: generatedSub,
                body: generatedBod,
                resumeBase64: resume.base64Data,
                resumeName: resume.name
              })
            });

            if (!sendRes.ok) throw new Error(await sendRes.text());

            updateJob(jobId, { status: "sent" });
            addLog(`   ✅ Email sent successfully!`);
          } catch (e: any) {
            addLog(`   ❌ Failed to send email: ${e.message}`);
          }
        } else {
          if (jobData.alternateContact) {
            addLog(`   ⚠️ Skipped Auto-Send. Apply manually via: ${jobData.alternateContact}`);
          } else {
            addLog(`   ⚠️ Skipped Auto-Send. Reason: No email address found in the job description.`);
          }
        }
      }

      addLog(`\n🎉 All processing complete! Redirecting to Dashboard...`);
      setTimeout(() => {
        router.push("/");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to process job details.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Automated Application Engine</h1>
          <p className="text-gray-500">Upload a chat or paste text. The AI will extract, generate, and send applications automatically.</p>
        </div>
        <button onClick={() => router.push("/")} className="text-sm font-medium text-gray-600 hover:text-gray-900" disabled={loading}>
          Cancel
        </button>
      </div>

      {!inputType ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setInputType("file")}
            className="flex flex-col items-center justify-center p-10 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-md transition text-left group"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Upload WhatsApp Chat</h3>
            <p className="text-gray-500 text-center">Upload a chat export containing multiple recruiter messages.</p>
          </button>

          <button
            onClick={() => setInputType("text")}
            className="flex flex-col items-center justify-center p-10 bg-white border-2 border-gray-100 rounded-2xl hover:border-green-500 hover:shadow-md transition text-left group"
          >
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Paste Job Descriptions</h3>
            <p className="text-gray-500 text-center">Paste a single or multiple job descriptions as text.</p>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {inputType === "text" ? "Paste Job Descriptions" : "Upload Chat File"}
            </h2>
            {!loading && (
              <button onClick={() => setInputType(null)} className="text-sm text-blue-600 hover:underline">
                Change Input Method
              </button>
            )}
          </div>

          {!loading && logs.length === 0 ? (
            <>
              {inputType === "text" ? (
                <textarea
                  className="w-full p-4 border rounded-xl h-64 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm"
                  placeholder="Paste the full job description(s) here..."
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                />
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:bg-gray-50 transition">
                  <input type="file" accept=".txt,.rtf" className="hidden" id="chat-upload" onChange={handleFileUpload} />
                  <label htmlFor="chat-upload" className="cursor-pointer flex flex-col items-center">
                    <FileText className="w-10 h-10 text-blue-500 mb-3" />
                    <span className="font-medium text-gray-900">{fileName || "Click to browse"}</span>
                    <span className="text-sm text-gray-500 mt-1">Upload .TXT chat exports</span>
                  </label>
                </div>
              )}

              {error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleProcess}
                  disabled={loading || (inputType === "text" ? !jobText : !fileContent)}
                  className="flex items-center bg-blue-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-800 transition disabled:opacity-50"
                >
                  <MessageSquare className="w-5 h-5 mr-2" /> Start Auto-Apply Robot
                </button>
              </div>
            </>
          ) : (
            <div className="bg-gray-900 text-green-400 p-6 rounded-xl font-mono text-sm h-80 overflow-y-auto">
              {progress.total > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-700 text-white flex justify-between">
                  <span>Processing Application: {progress.current} / {progress.total}</span>
                  {progress.current === progress.total && !loading ? (
                    <span className="text-green-400 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Done</span>
                  ) : (
                    <span className="text-blue-400 flex items-center"><Loader2 className="w-4 h-4 mr-1 animate-spin" /> In Progress</span>
                  )}
                </div>
              )}
              {logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap mb-1">{log}</div>
              ))}
              {error && (
                <div className="mt-4 p-4 bg-red-900 border border-red-500 text-white rounded-xl text-sm font-sans">
                  <strong>Engine Error:</strong> {error}
                </div>
              )}
              {loading && !error && (
                <div className="mt-4 flex items-center text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Working...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

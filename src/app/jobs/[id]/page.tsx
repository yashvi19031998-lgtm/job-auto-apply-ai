"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Loader2, ArrowLeft, Send, Sparkles, AlertCircle } from "lucide-react";

export default function JobApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const { jobs, resume, signature, websites, updateJob } = useAppStore();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  
  const job = jobs.find(j => j.id === params.id);
  
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");

  useEffect(() => {
    setMounted(true);
    if (job) {
      setEmailSubject(job.generatedSubject || "");
      setEmailBody(job.generatedBody || "");
      setRecipient(job.recipientEmail || "");
      setSelectedWebsiteId(job.selectedWebsiteId || "");
    }
  }, [job]);

  if (!mounted) return null;
  
  if (!job) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Job Application Not Found</h2>
        <button onClick={() => router.push("/")} className="text-blue-600 hover:underline">Return to Dashboard</button>
      </div>
    );
  }

  const handleGenerate = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDetails: {
            title: job.jobTitle,
            company: job.company,
            requirements: job.requirements
          },
          signature,
          resumeBase64: resume?.base64Data, // Only send if we need AI to parse it on server, else we could pre-parse. Let's assume we pass the resume for the AI prompt
          websites
        })
      });

      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      
      updateJob(job.id, {
        generatedSubject: data.subject,
        generatedBody: data.body,
        selectedWebsiteId: data.selectedWebsiteId,
        status: "generated"
      });
      
      setEmailSubject(data.subject);
      setEmailBody(data.body);
      setSelectedWebsiteId(data.selectedWebsiteId || "");
      
    } catch (err: any) {
      setError(err.message || "Failed to generate email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!recipient || !emailSubject || !emailBody) {
      setError("Please fill in all email fields.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject: emailSubject,
          body: emailBody,
          resumeBase64: resume?.base64Data,
          resumeName: resume?.name
        })
      });

      if (!res.ok) throw new Error(await res.text());
      
      updateJob(job.id, {
        status: "sent",
        recipientEmail: recipient,
        generatedSubject: emailSubject,
        generatedBody: emailBody,
        selectedWebsiteId
      });
      
      alert("Application sent successfully!");
      router.push("/");
      
    } catch (err: any) {
      setError(err.message || "Failed to send email.");
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => router.push("/")} className="mr-4 p-2 rounded-full hover:bg-gray-100 transition">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {job.jobTitle || "Untitled Position"}
            </h1>
            <p className="text-gray-500">{job.company || "Unknown Company"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Job Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Extracted Requirements</h3>
            <div className="prose prose-sm text-gray-600">
              <pre className="whitespace-pre-wrap font-sans text-sm">{job.requirements || "No specific requirements extracted."}</pre>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
            <button 
              onClick={handleGenerate} 
              disabled={loading || sending}
              className="w-full mb-3 flex items-center justify-center bg-purple-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
              {job.status === "draft" ? "Generate Application" : "Regenerate AI"}
            </button>
          </div>
        </div>

        {/* Right Column: Email Editor */}
        <div className="lg:col-span-2">
          {job.status === "draft" && !loading ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center h-full flex flex-col items-center justify-center">
              <Sparkles className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for AI Magic</h3>
              <p className="text-gray-500">Click Generate Application to tailor an email matching your resume to this job.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b space-y-4">
                <div className="flex items-center">
                  <label className="w-20 text-sm font-medium text-gray-500">To:</label>
                  <input 
                    type="email" 
                    value={recipient} 
                    onChange={e => setRecipient(e.target.value)} 
                    className="flex-1 px-3 py-1.5 border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none" 
                    placeholder="hr@company.com"
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-20 text-sm font-medium text-gray-500">Subject:</label>
                  <input 
                    type="text" 
                    value={emailSubject} 
                    onChange={e => setEmailSubject(e.target.value)} 
                    className="flex-1 px-3 py-1.5 border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-20 text-sm font-medium text-gray-500">Attach:</label>
                  <div className="flex-1 px-3 py-1.5 bg-gray-50 border rounded-lg text-sm text-gray-700 flex items-center">
                    {resume?.name} <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Automatically Attached</span>
                  </div>
                </div>
                
                {websites.length > 0 && (
                  <div className="flex items-center">
                    <label className="w-20 text-sm font-medium text-gray-500">Project:</label>
                    <select 
                      value={selectedWebsiteId}
                      onChange={e => setSelectedWebsiteId(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                    >
                      <option value="">No specific project mentioned</option>
                      {websites.map(w => (
                        <option key={w.id} value={w.id}>{w.name} - {w.url}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <textarea 
                  value={emailBody} 
                  onChange={e => setEmailBody(e.target.value)} 
                  className="w-full flex-1 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-sans min-h-[400px]"
                />
              </div>

              {error && (
                <div className="px-6 py-3 bg-red-50 text-red-700 border-t flex items-center text-sm">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              <div className="p-6 bg-gray-50 border-t flex justify-end">
                <button 
                  onClick={handleSend}
                  disabled={sending || loading}
                  className="flex items-center bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                  {sending ? "Sending..." : "Send Application"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

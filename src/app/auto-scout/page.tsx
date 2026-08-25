"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Globe, Search, Settings, Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { AutoScoutPreferences } from "@/types";

async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = 25000 } = options;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return fetch(resource, {
    ...options,
    signal: controller.signal
  });
}

export default function AutoScoutPage() {
  const router = useRouter();
  const { signature, resume, websites, jobs, autoScoutPreferences, setAutoScoutPreferences, addJob, updateJob } = useAppStore();
  const [mounted, setMounted] = useState(false);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<AutoScoutPreferences>({
    keywords: "React Developer",
    location: "Remote",
    mode: "freelance",
    source: "linkedin"
  });

  // Scraping State
  const [scrapedJobs, setScrapedJobs] = useState<any[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState("");

  // Processing State
  const [processingJobs, setProcessingJobs] = useState<Record<number, boolean>>({});
  const [processingLogs, setProcessingLogs] = useState<Record<number, string>>({});

  useEffect(() => {
    setMounted(true);
    if (!signature || !resume) {
      router.push("/setup");
      return;
    }
    if (autoScoutPreferences) {
      setPrefs(autoScoutPreferences);
    } else {
      setShowSettings(true);
    }
  }, [signature, resume, autoScoutPreferences, router]);

  const handleSavePrefs = () => {
    setAutoScoutPreferences(prefs);
    setShowSettings(false);
  };

  const handleScrape = async () => {
    if (!prefs.keywords || !prefs.location) {
      setError("Please configure keywords and location in settings.");
      return;
    }
    setIsScraping(true);
    setError("");
    setScrapedJobs([]);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: prefs.keywords, location: prefs.location, searchMode: prefs.mode, searchSource: prefs.source })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scraping failed");

      setScrapedJobs(data.jobs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const setLog = (idx: number, msg: string) => {
    setProcessingLogs(prev => ({ ...prev, [idx]: msg }));
  };

  const handleOneClickApply = async (job: any, idx: number) => {
    setProcessingJobs(prev => ({ ...prev, [idx]: true }));
    setLog(idx, "Extracting email...");

    try {
      // 1. Check Duplicates
      const isDuplicate = jobs.some(j => {
        const sameUrl = j.alternateContact && job.url && j.alternateContact.includes(job.url);
        const sameTitleAndCompany = j.jobTitle && job.title && j.company && job.company &&
          j.jobTitle.toLowerCase().trim() === job.title.toLowerCase().trim() &&
          j.company.toLowerCase().trim() === job.company.toLowerCase().trim();
        return sameUrl || sameTitleAndCompany;
      });

      if (isDuplicate) {
        setLog(idx, "Skipped: Already applied/imported.");
        setProcessingJobs(prev => ({ ...prev, [idx]: false }));
        return;
      }

      // 2. Extract
      const content = `Job Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nJob Link: ${job.url}\nSnippet: ${job.snippet}`;
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, inputType: "scraper", jobType: prefs.mode })
      });

      if (!extractRes.ok) throw new Error("Extraction failed");
      const extractData = await extractRes.json();
      const extracted = extractData.jobs?.[0];

      if (!extracted) {
         setLog(idx, "Failed: Could not extract job data.");
         setProcessingJobs(prev => ({ ...prev, [idx]: false }));
         return;
      }

      // 3. Save as Draft
      let jobId;
      try {
        jobId = addJob({
          inputSource: "scraper",
          originalInput: content,
          status: "draft",
          jobType: prefs.mode,
          jobTitle: extracted.jobTitle || job.title,
          company: extracted.company || job.company,
          recipientEmail: extracted.recipientEmail,
          alternateContact: extracted.alternateContact || job.url,
          recruiterName: extracted.recruiterName,
          requirements: extracted.requirements,
          jobUrl: extracted.alternateContact || job.url
        });
      } catch (e: any) {
         setLog(idx, `Failed: ${e.message}`);
         setProcessingJobs(prev => ({ ...prev, [idx]: false }));
         return;
      }

      if (!extracted.recipientEmail) {
         let msg = "Saved as Draft (No Email Found). Apply manually.";
         if (extracted.alternateContact && extracted.alternateContact.includes('Phone:')) {
           const phoneMatch = extracted.alternateContact.match(/Phone:\s*([^\n|]+)/);
           if (phoneMatch) {
             msg = `No Email Found. Call them at: ${phoneMatch[1].trim()}`;
           }
         }
         setLog(idx, msg);
         setProcessingJobs(prev => ({ ...prev, [idx]: false }));
         return;
      }

      // 4. Generate Email
      setLog(idx, "Generating AI Email...");
      const genRes = await fetchWithTimeout("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDetails: {
            title: extracted.jobTitle || job.title,
            company: extracted.company || job.company,
            requirements: extracted.requirements
          },
          signature,
          resumeBase64: resume!.base64Data,
          websites,
          jobType: prefs.mode
        })
      });

      if (!genRes.ok) throw new Error("Generation failed");
      const genData = await genRes.json();

      updateJob(jobId, {
        generatedSubject: genData.subject,
        generatedBody: genData.body,
        selectedWebsiteId: genData.selectedWebsiteId,
        status: "generated"
      });

      // 5. Send Email
      setLog(idx, "Sending Email...");
      const sendRes = await fetchWithTimeout("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: extracted.recipientEmail,
          subject: genData.subject,
          body: genData.body,
          resumeBase64: resume!.base64Data,
          resumeName: resume!.name
        })
      });

      if (!sendRes.ok) throw new Error("Failed to send email");

      updateJob(jobId, { status: "sent" });
      setLog(idx, "✅ Sent Successfully!");

    } catch (e: any) {
      setLog(idx, `Error: ${e.message}`);
    } finally {
      setProcessingJobs(prev => ({ ...prev, [idx]: false }));
    }
  };

  if (!mounted || !signature) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Globe className="w-8 h-8 mr-3 text-purple-600" /> Auto-Scout
          </h1>
          <p className="text-gray-500">Find daily leads and apply with a single click.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 shadow-sm px-4 py-2.5 rounded-xl transition"
          >
            <Settings className="w-5 h-5 mr-2" /> Settings
          </button>
          <button 
            onClick={() => router.push("/")}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 shadow-sm px-4 py-2.5 rounded-xl transition"
          >
            Dashboard
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border mb-8 border-purple-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Auto-Scout Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
              <input
                type="text"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                value={prefs.keywords}
                onChange={e => setPrefs({...prefs, keywords: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                value={prefs.location}
                onChange={e => setPrefs({...prefs, location: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                value={prefs.mode}
                onChange={e => setPrefs({...prefs, mode: e.target.value as any})}
              >
                <option value="freelance">Freelance / Contract / IT Leads</option>
                <option value="fulltime">Full-Time Jobs</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Portal</label>
              <select
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                value={prefs.source}
                onChange={e => setPrefs({...prefs, source: e.target.value as any})}
              >
                <option value="linkedin">LinkedIn (Recommended)</option>
                <option value="web">Global Web Search (Email-First)</option>
                <option value="naukri">Naukri.com</option>
                <option value="indeed">Indeed</option>
              </select>
            </div>
          </div>
          <button 
            onClick={handleSavePrefs}
            className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition"
          >
            Save Preferences
          </button>
        </div>
      )}

      {!showSettings && (
        <div className="bg-purple-50 p-8 rounded-2xl border border-purple-100 flex flex-col items-center justify-center text-center mb-8">
          <Globe className="w-12 h-12 text-purple-400 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to find leads?</h3>
          <p className="text-gray-600 mb-6 max-w-md text-sm">
            Searching for <strong>{prefs.keywords}</strong> in <strong>{prefs.location}</strong> 
            ({prefs.mode === 'freelance' ? 'Freelance/Leads' : 'Full-Time'}).
          </p>
          <button
            onClick={handleScrape}
            disabled={isScraping}
            className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-700 transition shadow-md disabled:opacity-50 flex items-center text-lg"
          >
            {isScraping ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Search className="w-6 h-6 mr-3" />}
            {isScraping ? "Scouting the web..." : "Find Today's Leads"}
          </button>
          {error && <p className="text-red-500 mt-4 text-sm font-medium"><AlertCircle className="w-4 h-4 inline mr-1" /> {error}</p>}
        </div>
      )}

      {scrapedJobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Found {scrapedJobs.length} Opportunities</h2>
          {scrapedJobs.map((job, idx) => {
            const isProcessing = processingJobs[idx];
            const logMsg = processingLogs[idx];
            const isDone = logMsg?.includes("✅");
            
            return (
              <div key={idx} className="bg-white p-5 border rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg">{job.title || "Unknown Title"}</h4>
                  <p className="text-sm text-gray-600 font-medium mb-2">{job.company || "Unknown Company"} &bull; {job.location || "Unknown Location"}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{job.snippet}</p>
                  {logMsg && (
                    <div className={`mt-3 text-sm font-medium flex items-center ${isDone ? 'text-green-600' : 'text-blue-600'}`}>
                      {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {isDone && <CheckCircle2 className="w-4 h-4 mr-2" />}
                      {logMsg}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <button
                    onClick={() => handleOneClickApply(job, idx)}
                    disabled={isProcessing || isDone}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition"
                  >
                    {isProcessing ? "Working..." : isDone ? "Applied" : <><Play className="w-4 h-4 mr-1.5 fill-current" /> 1-Click Apply</>}
                  </button>
                  <a href={job.url} target="_blank" rel="noreferrer" className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-800 p-2">
                    View Source
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

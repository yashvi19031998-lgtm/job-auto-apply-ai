"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { 
  Briefcase, 
  FileText, 
  Globe, 
  Plus, 
  Settings, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  Mail,
  Send,
  Target,
  Search
} from "lucide-react";
import Link from "next/link";
import { JobApplication } from "@/types";

export default function Dashboard() {
  const router = useRouter();
  const { signature, resume, websites, jobs, updateJob } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!signature || !resume) {
      router.push("/settings");
    }
  }, [signature, resume, router]);

  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "pending" | "generated" | "sent" | "manually_applied" | "freelance" | "fulltime">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  if (!mounted || !signature) return null;

  // KPI Calculations
  const totalJobs = jobs.length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newToday = jobs.filter(j => j.createdAt >= todayStart.getTime()).length;
  const pendingJobs = jobs.filter(j => j.status === 'draft' || j.status === 'generated' || j.status === 'error');
  const emailsReady = jobs.filter(j => j.status === 'generated').length;
  const sent = jobs.filter(j => j.status === 'sent').length;
  const manuallyApplied = jobs.filter(j => j.status === 'manually_applied').length;
  const freelanceLeads = jobs.filter(j => j.jobType === 'freelance').length;
  
  // Attention Required
  const attentionJobs = jobs.filter(j => {
    if (j.status === 'draft' && !j.recipientEmail) return true; // Missing email
    if (j.status === 'error') return true; // Failed
    if (j.status === 'generated') return true; // Needs review/send
    return false;
  }).slice(0, 5); // Show top 5

  // Table Filtering
  let filteredJobs = jobs;
  if (activeFilter === "today") {
    filteredJobs = jobs.filter(j => j.createdAt >= todayStart.getTime());
  } else if (activeFilter === "pending") {
    filteredJobs = jobs.filter(j => j.status === 'draft' || j.status === 'error');
  } else if (activeFilter === "generated") {
    filteredJobs = jobs.filter(j => j.status === 'generated');
  } else if (activeFilter === "sent") {
    filteredJobs = jobs.filter(j => j.status === 'sent');
  } else if (activeFilter === "manually_applied") {
    filteredJobs = jobs.filter(j => j.status === 'manually_applied');
  } else if (activeFilter === "freelance") {
    filteredJobs = jobs.filter(j => j.jobType === 'freelance');
  } else if (activeFilter === "fulltime") {
    filteredJobs = jobs.filter(j => j.jobType === 'fulltime');
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredJobs = filteredJobs.filter(j => 
      j.jobTitle?.toLowerCase().includes(q) || 
      j.company?.toLowerCase().includes(q) ||
      j.recipientEmail?.toLowerCase().includes(q)
    );
  }

  filteredJobs = filteredJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getExternalLink = (job: JobApplication) => {
    if (!job.alternateContact) return null;
    if (job.alternateContact.toLowerCase().includes('linkedin.com')) return { type: 'linkedin', url: job.alternateContact.match(/https?:\/\/[^\s]+/)?.[0] };
    if (job.alternateContact.toLowerCase().includes('docs.google.com/forms') || job.alternateContact.toLowerCase().includes('forms.gle')) return { type: 'form', url: job.alternateContact.match(/https?:\/\/[^\s]+/)?.[0] };
    const anyUrlMatch = job.alternateContact.match(/https?:\/\/[^\s]+/);
    if (anyUrlMatch) return { type: 'link', url: anyUrlMatch[0] };
    const digits = job.alternateContact.replace(/\D/g, '');
    if (digits.length >= 10) {
      const waNumber = digits.length === 10 ? "91" + digits : digits;
      const message = `Hi, I am interested in the ${job.jobTitle || 'open'} role at ${job.company || 'your company'}. I am an Immediate Joiner. Could you please review my profile?`;
      return { type: 'whatsapp', url: `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` };
    }
    if (job.alternateContact.trim().length > 3) return { type: 'text', text: job.alternateContact, url: null };
    return null;
  };

  const renderJobRow = (job: JobApplication) => {
    const externalAction = getExternalLink(job);
    return (
      <tr key={job.id} className="hover:bg-gray-50 transition border-b border-gray-100 last:border-0">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[250px]" title={job.jobTitle}>{job.jobTitle || "Processing..."}</span>
            <span className="text-xs text-gray-500 truncate max-w-[250px]" title={job.company}>{job.company || "Unknown Company"}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
          <span className="text-sm text-gray-600 capitalize">{job.jobType || "Job"}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
          <span className="text-sm text-gray-500 capitalize">{job.inputSource || "Web"}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-md 
            ${job.status === 'sent' ? 'bg-green-100 text-green-700' : 
              job.status === 'manually_applied' ? 'bg-teal-100 text-teal-700' :
              job.status === 'generated' ? 'bg-blue-100 text-blue-700' : 
              job.status === 'error' ? 'bg-red-100 text-red-700' : 
              'bg-orange-100 text-orange-700'}`}>
            {job.status === 'manually_applied' ? 'Manually Applied' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
          {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center justify-end space-x-3">
            {job.status !== 'sent' && job.status !== 'manually_applied' && (
              <button 
                onClick={() => updateJob(job.id, { status: 'manually_applied' })}
                title="Mark as Manually Applied"
                className="text-gray-400 hover:text-teal-600 transition p-1.5 rounded-md hover:bg-teal-50"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition">
              View
            </Link>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Here is what's happening with your job search today.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href="/auto-scout" className="flex-1 sm:flex-none flex items-center justify-center bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm">
            <Globe className="w-4 h-4 mr-2 text-blue-600" />
            Auto-Scout
          </Link>
          <Link href="/jobs/import" className="flex-1 sm:flex-none flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Application
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Briefcase className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Total Jobs</span>
          </div>
          <span className="text-3xl font-bold text-gray-900">{totalJobs}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Target className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">New Today</span>
          </div>
          <span className="text-3xl font-bold text-gray-900">{newToday}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-orange-200 bg-orange-50/30 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Clock className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider text-orange-700">Pending</span>
          </div>
          <span className="text-3xl font-bold text-orange-900">{pendingJobs.length}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-green-200 bg-green-50/30 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider text-green-700">Sent</span>
          </div>
          <span className="text-3xl font-bold text-green-900">{sent}</span>
        </div>
      </div>

      {/* Needs Your Attention */}
      {attentionJobs.length > 0 && (
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-gray-900">Needs Your Attention</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attentionJobs.map(job => (
              <div key={job.id} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{job.jobTitle}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{job.company}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                    {job.status === 'draft' ? 'Missing Email' : job.status === 'generated' ? 'Ready to Send' : 'Failed'}
                  </span>
                  <Link href={`/jobs/${job.id}`} className="text-xs font-bold text-blue-600 hover:underline">Review &rarr;</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50/50">
          <div className="flex flex-wrap gap-2">
            {["all", "today", "pending", "generated", "sent", "manually_applied", "freelance"].map((f) => (
              <button 
                key={f}
                onClick={() => { setActiveFilter(f as any); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition ${
                  activeFilter === f ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-900 border border-transparent'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-64">
            <input 
              type="text" 
              placeholder="Search jobs, companies..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {paginatedJobs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-semibold text-gray-900">No jobs found</h3>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or import a new job.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {paginatedJobs.map(renderJobRow)}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">Showing <span className="font-semibold text-gray-900">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(page * ITEMS_PER_PAGE, filteredJobs.length)}</span> of <span className="font-semibold text-gray-900">{filteredJobs.length}</span></span>
            <div className="flex space-x-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition">
                 <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition">
                 <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AutoScoutLead, JobApplication } from "@/types";
import { 
  Briefcase, 
  Search, 
  MapPin, 
  Building, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Mail,
  Phone,
  Globe
} from "lucide-react";
import Link from "next/link";

interface UnifiedJob {
  id: string;
  title: string;
  company: string;
  type: string; // 'imported', 'auto-scout'
  source: string; // 'Import', 'linkedin', 'web', 'custom'
  status: string; // 'applied', 'new', 'draft', 'failed', 'ignored', 'no_email', 'sent', 'manually_applied', 'generated'
  jobType: string; // 'fulltime', 'freelance', 'unknown'
  date: number;
  originalId: string;
  isLead: boolean;
  location?: string;
  jobUrl?: string;
  email?: string;
  phone?: string;
}

export default function AllJobsPage() {
  const router = useRouter();
  const { signature, resume, jobs: importedJobs } = useAppStore();
  const [mounted, setMounted] = useState(false);
  
  const [leads, setLeads] = useState<AutoScoutLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterSource, setFilterSource] = useState<"all" | "imported" | "linkedin" | "reddit" | "web" | "custom">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterJobType, setFilterJobType] = useState<"all" | "full_time" | "flexible">("all");
  const [filterDate, setFilterDate] = useState<"all" | "today" | "past_week" | "past_month">("all");
  const [filterRegion, setFilterRegion] = useState<"all" | "india" | "international">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    setMounted(true);
    if (!signature || !resume) {
      router.push("/settings");
    }
  }, [signature, resume, router]);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/auto-scout/leads");
        const data = await res.json();
        if (res.ok) {
          setLeads(data.leads || []);
        } else {
          setError(data.error || "Failed to load leads");
        }
      } catch (err: any) {
        setError("Failed to load leads");
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  if (!mounted || !signature) return null;

  // Normalize data
  const unifiedJobs: UnifiedJob[] = [];

  // 1. Add imported jobs
  importedJobs.forEach(job => {
    unifiedJobs.push({
      id: `imported-${job.id}`,
      title: job.jobTitle || "Unknown Title",
      company: job.company || "Unknown Company",
      type: "imported",
      source: "Import",
      status: job.status,
      jobType: job.jobType || "unknown",
      date: job.createdAt,
      originalId: job.id,
      isLead: false,
      location: "Unknown", // Imported jobs don't have location typically
      jobUrl: job.jobUrl || job.alternateContact,
      email: job.recipientEmail,
    });
  });

  // 2. Add auto-scout leads
  leads.forEach(lead => {
    // Infer Job Type
    let inferredType = "unknown";
    const text = ((lead.jobTitle || "") + " " + (lead.fullDescription || "")).toLowerCase();
    
    if (text.includes("full time") || text.includes("full-time") || text.includes("fulltime")) {
      inferredType = "fulltime";
    } else if (text.includes("flexible") || text.includes("part time") || text.includes("part-time") || text.includes("freelance") || text.includes("contract")) {
      inferredType = "freelance";
    }

    unifiedJobs.push({
      id: `lead-${lead.id}`,
      title: lead.jobTitle || "Unknown Title",
      company: lead.company || "Unknown Company",
      type: "auto-scout",
      source: lead.source || "Auto-Scout",
      status: lead.status, // new, applied, no_email, failed, ignored
      jobType: inferredType,
      date: lead.lastSeenAt || lead.firstSeenAt,
      originalId: lead.id,
      isLead: true,
      location: lead.location,
      jobUrl: lead.jobUrl,
      email: lead.recipientEmail,
      phone: lead.phone
    });
  });

  // Filter
  let filteredJobs = unifiedJobs.filter(job => {
    // 1. Filter by Source
    if (filterSource !== "all") {
      if (filterSource === "imported" && job.type !== "imported") return false;
      if (filterSource === "linkedin" && job.source !== "linkedin") return false;
      if (filterSource === "reddit" && job.source !== "reddit") return false;
      if (filterSource === "web" && job.source !== "web") return false;
      if (filterSource === "custom" && job.source !== "custom") return false;
    }

    // 2. Filter by Status
    if (filterStatus !== "all") {
      // Create groups of statuses since terminology differs slightly
      if (filterStatus === "applied") {
        if (!['sent', 'manually_applied', 'applied'].includes(job.status)) return false;
      } else if (filterStatus === "pending") {
        if (!['draft', 'generated', 'new', 'no_email'].includes(job.status)) return false;
      } else if (filterStatus === "failed") {
        if (!['error', 'failed', 'ignored'].includes(job.status)) return false;
      } else if (filterStatus === "whatsapp_pending") {
        if (!job.phone) return false;
      } else if (job.status !== filterStatus) {
        return false;
      }
    }

    // 3. Filter by Job Type
    if (filterJobType !== "all") {
      if (filterJobType === "full_time" && job.jobType !== "fulltime") return false;
      if (filterJobType === "flexible" && job.jobType !== "freelance") return false;
    }

    // 4. Filter by Date
    if (filterDate !== "all") {
      const now = new Date().getTime();
      const jobDate = new Date(job.date).getTime();
      const diffHours = (now - jobDate) / (1000 * 60 * 60);
      
      if (filterDate === "today" && diffHours > 24) return false;
      if (filterDate === "past_week" && diffHours > 24 * 7) return false;
      if (filterDate === "past_month" && diffHours > 24 * 30) return false;
    }

    // 5. Filter by Region
    if (filterRegion !== "all") {
      if (!job.phone) return false;
      const clean = job.phone.replace(/[^0-9+]/g, '');
      const isIndia = clean.startsWith('+91') || (clean.startsWith('91') && clean.length === 12) || clean.length === 10 || (clean.startsWith('0') && clean.length === 11);
      
      if (filterRegion === "india" && !isIndia) return false;
      if (filterRegion === "international" && isIndia) return false;
    }

    // 6. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Sort
  filteredJobs.sort((a, b) => {
    if (sortBy === "oldest") return a.date - b.date;
    return b.date - a.date;
  });

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Render Status Badge
  const renderStatus = (status: string) => {
    if (['sent', 'manually_applied', 'applied'].includes(status)) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-100"><CheckCircle2 size={12}/> Applied</span>;
    }
    if (['draft', 'generated', 'new', 'no_email'].includes(status)) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100"><Clock size={12}/> Pending</span>;
    }
    if (['error', 'failed', 'ignored'].includes(status)) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-100"><AlertCircle size={12}/> Failed</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200 capitalize">{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
              All Job Records
            </h1>
            <p className="text-gray-500 text-lg font-medium max-w-2xl">
              A unified view of every opportunity you've imported, applied to, or scouted automatically.
            </p>
          </div>
          
          <div className="flex bg-white p-3 rounded-2xl shadow-sm border border-gray-100 gap-6">
            <div className="px-4 border-r border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-black text-gray-900">{unifiedJobs.length}</p>
            </div>
            <div className="px-4 border-r border-gray-100">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Scouted</p>
              <p className="text-2xl font-black text-purple-700">{leads.length}</p>
            </div>
            <div className="px-4">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Imported</p>
              <p className="text-2xl font-black text-blue-700">{importedJobs.length}</p>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Filter size={16} className="text-gray-400" />
              <select 
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
                value={filterSource} onChange={e => {setFilterSource(e.target.value as any); setPage(1);}}
              >
                <option value="all">All Sources</option>
                <option value="imported">Import</option>
                <option value="linkedin">LinkedIn</option>
                <option value="reddit">Reddit</option>
                <option value="web">Web Search</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <select 
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
                value={filterStatus} onChange={e => {setFilterStatus(e.target.value); setPage(1);}}
              >
                <option value="all">All Statuses</option>
                <option value="applied">Applied / Sent</option>
                <option value="pending">Pending / Draft</option>
                <option value="failed">Failed / Ignored</option>
                <option value="whatsapp_pending">WhatsApp Pending</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <select 
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
                value={filterJobType} onChange={e => {setFilterJobType(e.target.value as any); setPage(1);}}
              >
                <option value="all">All Job Types</option>
                <option value="full_time">Full Time</option>
                <option value="flexible">Flexible / Freelance</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <select 
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
                value={filterDate} onChange={e => {setFilterDate(e.target.value as any); setPage(1);}}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="past_week">Past Week</option>
                <option value="past_month">Past Month</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <select 
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
                value={filterRegion} onChange={e => {setFilterRegion(e.target.value as any); setPage(1);}}
              >
                <option value="all">All Regions</option>
                <option value="india">Indian Numbers</option>
                <option value="international">International Numbers</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
              <select 
                className="bg-transparent text-sm font-bold text-blue-700 outline-none cursor-pointer"
                value={sortBy} onChange={e => {setSortBy(e.target.value as any); setPage(1);}}
              >
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Sort by: Oldest</option>
              </select>
            </div>
          </div>

          <div className="relative w-full lg:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search roles or companies..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              value={searchQuery}
              onChange={e => {setSearchQuery(e.target.value); setPage(1);}}
            />
          </div>
        </div>

        {/* Unified Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
             <div className="py-24 text-center">
               <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-4"></div>
               <p className="text-gray-500 font-medium">Gathering unified data...</p>
             </div>
          ) : paginatedJobs.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Briefcase className="text-gray-400 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No matching jobs found</h3>
              <p className="text-gray-500 font-medium max-w-md mx-auto">Try relaxing your filters or search query to see more results.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Job Details</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Origin</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Job Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedJobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 truncate max-w-[300px] group-hover:text-blue-600 transition-colors">{job.title}</span>
                          <span className="text-sm text-gray-500 truncate max-w-[300px] flex items-center gap-1 mt-0.5"><Building size={12}/> {job.company}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {job.type === 'auto-scout' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                            <Globe size={12} /> {job.source}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <Briefcase size={12} /> {job.source}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-600 capitalize">
                          {job.jobType === 'fulltime' ? 'Full Time' : job.jobType === 'freelance' ? 'Flexible' : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {renderStatus(job.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {new Date(job.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3">
                          {!job.isLead && (
                            <Link href={`/jobs/${job.originalId}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Application">
                              <Eye size={18} />
                            </Link>
                          )}
                          {job.isLead && (
                            <Link href={`/auto-scout/dashboard`} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Manage Lead">
                              <ExternalLink size={18} />
                            </Link>
                          )}
                          {job.email && (
                            <a href={`mailto:${job.email}`} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Email">
                              <Mail size={18} />
                            </a>
                          )}
                          {job.phone && (
                            <a href={`https://wa.me/${job.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm ${signature?.fullName || "interested"}. I came across your job posting for "${job.title}" at ${job.company}. I would love to discuss this opportunity!`)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-all shadow-sm flex items-center gap-1.5 hover:shadow-md" title="Send WhatsApp">
                              <Phone size={14} /> <span className="text-xs font-bold">WhatsApp</span>
                            </a>
                          )}
                          {job.jobUrl && (
                            <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors" title="Original Post">
                              <Globe size={18} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{(page - 1) * ITEMS_PER_PAGE + (paginatedJobs.length > 0 ? 1 : 0)}</span> to <span className="font-bold text-gray-900">{(page - 1) * ITEMS_PER_PAGE + paginatedJobs.length}</span> of <span className="font-bold text-gray-900">{filteredJobs.length}</span> records
              </span>
              <div className="flex space-x-2">
                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition shadow-sm">
                   <ChevronLeft size={18} />
                </button>
                <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition shadow-sm">
                   <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

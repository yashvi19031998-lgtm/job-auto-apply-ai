"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { AutoScoutLead } from "@/types";
import { ExternalLink, Eye, RefreshCw, Mail, Phone, Globe, CheckCircle2, AlertCircle, Clock, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { calculateLocalMatchScore } from "@/utils/score";

export default function AutoScoutDashboard() {
  const store = useAppStore();
  const [leads, setLeads] = useState<AutoScoutLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedLead, setSelectedLead] = useState<AutoScoutLead | null>(null);

  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "applied" | "no_email" | "failed" | "ignored" | "whatsapp_pending">("all");
  const [filterSource, setFilterSource] = useState<"all" | "linkedin" | "reddit" | "web" | "custom">("all");
  const [filterJobType, setFilterJobType] = useState<"all" | "full_time" | "flexible">("all");
  const [filterDate, setFilterDate] = useState<"all" | "today" | "past_week" | "past_month">("all");
  const [filterRegion, setFilterRegion] = useState<"all" | "india" | "international">("all");

  const [autoPilotStatus, setAutoPilotStatus] = useState<any>(null);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    // Sync store data to server for background worker
    if (store.signature && store.resume && store.autoScoutPreferences) {
      fetch("/api/auto-scout/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: store.signature,
          resume: store.resume,
          autoScoutPreferences: store.autoScoutPreferences,
          websites: store.websites
        })
      }).catch(err => console.error("Sync failed:", err));
    }
    
    fetchLeads();
    // Status is checked manually or on load
  }, [store]);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/auto-scout/leads");
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
      } else {
        setError(data.error);
      }
      
      // Try to fetch autopilot status if it exists
      try {
        const statusRes = await fetch("/api/auto-scout/status");
        if (statusRes.ok) {
          setAutoPilotStatus(await statusRes.json());
        }
      } catch (e) {
        // Ignored
      }
    } catch (err: any) {
      setError("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const [sortBy, setSortBy] = useState<"newest" | "best_match">("newest");

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== "all") {
      if (filterStatus === "whatsapp_pending") {
        if (!l.phone) return false;
      } else if (l.status !== filterStatus) {
        return false;
      }
    }
    if (filterSource !== "all" && l.source !== filterSource) return false;
    
    if (filterJobType !== "all") {
      const title = (l.jobTitle || "").toLowerCase();
      const desc = (l.fullDescription || "").toLowerCase();
      const text = title + " " + desc;
      
      if (filterJobType === "full_time") {
        if (!text.includes("full time") && !text.includes("full-time") && !text.includes("fulltime")) {
          return false;
        }
      } else if (filterJobType === "flexible") {
        if (!text.includes("flexible") && !text.includes("part time") && !text.includes("part-time") && !text.includes("freelance") && !text.includes("contract")) {
          return false;
        }
      }
    }
    
    if (filterDate !== "all") {
      const now = new Date().getTime();
      const jobDate = new Date(l.lastSeenAt || l.firstSeenAt).getTime();
      const diffHours = (now - jobDate) / (1000 * 60 * 60);
      
      if (filterDate === "today" && diffHours > 24) return false;
      if (filterDate === "past_week" && diffHours > 24 * 7) return false;
      if (filterDate === "past_month" && diffHours > 24 * 30) return false;
    }
    
    if (filterRegion !== "all") {
      if (!l.phone) return false;
      const clean = l.phone.replace(/[^0-9+]/g, '');
      const isIndia = clean.startsWith('+91') || (clean.startsWith('91') && clean.length === 12) || clean.length === 10 || (clean.startsWith('0') && clean.length === 11);
      if (filterRegion === "india" && !isIndia) return false;
      if (filterRegion === "international" && isIndia) return false;
    }

    return true;
  }).map(lead => ({
    ...lead,
    _localScore: calculateLocalMatchScore(lead, store.signature, store.autoScoutPreferences)
  })).sort((a, b) => {
    if (sortBy === "best_match") {
      return (b._localScore || 0) - (a._localScore || 0);
    }
    return b.lastSeenAt - a.lastSeenAt;
  });

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const renderContact = (lead: AutoScoutLead) => {
    if (lead.recipientEmail) return <div className="flex items-center gap-1 text-sm text-green-600"><Mail size={14}/> {lead.recipientEmail}</div>;
    if (lead.phone) return <div className="flex items-center gap-1 text-sm text-blue-600"><Phone size={14}/> {lead.phone}</div>;
    if (lead.applicationUrl || lead.companyWebsite) return <div className="flex items-center gap-1 text-sm text-purple-600"><Globe size={14}/> Website/App</div>;
    return <span className="text-gray-400 text-sm">None</span>;
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Auto-Pilot Dashboard</h1>
          <p className="text-gray-500 mt-2">Manage leads discovered by your background worker.</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm flex gap-6">
          <div>
            <p className="text-gray-500 font-medium mb-1">Auto-Pilot Status</p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="font-semibold text-gray-900">Waiting for Worker...</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Run \`node run-autopilot.js\` locally</p>
          </div>
          <div className="border-l border-gray-200 pl-6">
            <p className="text-gray-500 font-medium mb-1">Database</p>
            <p className="font-semibold text-gray-900">{leads.length} Total Leads</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <select 
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          value={filterStatus} onChange={(e) => {setFilterStatus(e.target.value as any); setPage(1);}}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="applied">Applied (Emailed)</option>
          <option value="no_email">No Email Found</option>
          <option value="failed">Failed</option>
          <option value="ignored">Ignored (Low Match)</option>
          <option value="whatsapp_pending">WhatsApp Pending</option>
        </select>
        
        <select 
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          value={filterSource} onChange={(e) => {setFilterSource(e.target.value as any); setPage(1);}}
        >
          <option value="all">All Sources</option>
          <option value="linkedin">LinkedIn</option>
          <option value="reddit">Reddit</option>
          <option value="web">Web Search</option>
          <option value="custom">Custom</option>
        </select>

        <select 
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          value={filterJobType} onChange={(e) => {setFilterJobType(e.target.value as any); setPage(1);}}
        >
          <option value="all">All Job Types</option>
          <option value="full_time">Full Time</option>
          <option value="flexible">Flexible Time</option>
        </select>

        <select 
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          value={filterDate} onChange={(e) => {setFilterDate(e.target.value as any); setPage(1);}}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="past_week">Past Week</option>
          <option value="past_month">Past Month</option>
        </select>

        <select 
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          value={filterRegion} onChange={(e) => {setFilterRegion(e.target.value as any); setPage(1);}}
        >
          <option value="all">All Regions</option>
          <option value="india">Indian Numbers</option>
          <option value="international">International Numbers</option>
        </select>

        <select 
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-blue-50 font-medium"
          value={sortBy} onChange={(e) => {setSortBy(e.target.value as any); setPage(1);}}
        >
          <option value="newest">Sort by: Newest</option>
          <option value="best_match">Sort by: Best Match</option>
        </select>

        <button onClick={fetchLeads} className="ml-auto flex items-center gap-2 text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" /></div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-20 text-center border rounded-lg bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">No leads found</h3>
          <p className="text-sm text-gray-500 mt-1">Ensure the background worker is running.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title & Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source & Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{lead.jobTitle}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[250px]">{lead.company}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 capitalize">{lead.source}</div>
                      <div className="text-sm text-gray-500">{lead.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      {renderContact(lead)}
                    </td>
                    <td className="px-6 py-4">
                      {lead.status === 'applied' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 size={12} className="mr-1"/> Emailed</span>}
                      {lead.status === 'new' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">New</span>}
                      {lead.status === 'no_email' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">No Email</span>}
                      {lead.status === 'failed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle size={12} className="mr-1"/> Failed</span>}
                      {lead.status === 'ignored' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><AlertCircle size={12} className="mr-1"/> Ignored</span>}
                      {lead.errorReason && <p className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate">{lead.errorReason}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1"><Clock size={12}/> {new Date(lead.lastSeenAt).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setSelectedLead(lead)} className="text-gray-400 hover:text-blue-600 transition-colors" title="View Full Description">
                          <Eye size={18} />
                        </button>
                        {lead.recipientEmail && (
                          <a href={`mailto:${lead.recipientEmail}`} className="text-gray-400 hover:text-green-600 transition-colors" title="Send Email">
                            <Mail size={18} />
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm ${store.signature?.fullName || "interested"}. I came across your job posting for "${lead.jobTitle}" at ${lead.company}. I would love to discuss this opportunity!`)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-all shadow-sm flex items-center gap-1.5 hover:shadow-md" title="Send WhatsApp">
                            <Phone size={14} /> <span className="text-xs font-bold">WhatsApp</span>
                          </a>
                        )}
                        {lead.jobUrl && (
                          <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors" title="Open Job URL">
                            <ExternalLink size={18} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{(page - 1) * ITEMS_PER_PAGE + (paginatedLeads.length > 0 ? 1 : 0)}</span> to <span className="font-bold text-gray-900">{(page - 1) * ITEMS_PER_PAGE + paginatedLeads.length}</span> of <span className="font-bold text-gray-900">{filteredLeads.length}</span> records
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
      )}

      {/* FULL POST MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">{selectedLead.jobTitle}</h2>
              <button onClick={() => setSelectedLead(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><span className="text-gray-500">Company:</span> <span className="font-medium">{selectedLead.company}</span></div>
                <div><span className="text-gray-500">Location:</span> <span className="font-medium">{selectedLead.location}</span></div>
                <div><span className="text-gray-500">Source:</span> <span className="font-medium capitalize">{selectedLead.source}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className="font-medium">{selectedLead.status}</span></div>
                
                <div className="col-span-2 mt-2 pt-2 border-t">
                  <span className="text-gray-500">Email:</span> <span className="font-medium text-green-700">{selectedLead.recipientEmail || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Phone:</span> <span className="font-medium text-blue-700">{selectedLead.phone || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">App URL:</span> <span className="font-medium text-purple-700">{selectedLead.applicationUrl || selectedLead.companyWebsite || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Original URL:</span> <a href={selectedLead.jobUrl} target="_blank" className="font-medium text-blue-600 hover:underline">{selectedLead.jobUrl}</a>
                </div>
              </div>
              
              <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold text-lg mb-4">Full Description</h3>
                <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-md border font-mono">
                  {selectedLead.fullDescription || 'No description captured.'}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedLead(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

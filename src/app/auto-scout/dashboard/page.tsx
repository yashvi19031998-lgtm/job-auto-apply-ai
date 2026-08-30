"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { AutoScoutLead } from "@/types";
import { ExternalLink, Eye, RefreshCw, Mail, Phone, Globe, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

export default function AutoScoutDashboard() {
  const store = useAppStore();
  const [leads, setLeads] = useState<AutoScoutLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedLead, setSelectedLead] = useState<AutoScoutLead | null>(null);

  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "applied" | "no_email" | "failed">("all");
  const [filterSource, setFilterSource] = useState<"all" | "linkedin" | "web" | "custom">("all");

  const [autoPilotStatus, setAutoPilotStatus] = useState<any>(null);

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
    // Poll for status
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
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

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterSource !== "all" && l.source !== filterSource) return false;
    return true;
  }).sort((a, b) => b.lastSeenAt - a.lastSeenAt);

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
          value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="applied">Applied (Emailed)</option>
          <option value="no_email">No Email Found</option>
          <option value="failed">Failed</option>
        </select>
        
        <select 
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)}
        >
          <option value="all">All Sources</option>
          <option value="linkedin">LinkedIn</option>
          <option value="web">Web Search</option>
          <option value="custom">Custom</option>
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
              {filteredLeads.map((lead) => (
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

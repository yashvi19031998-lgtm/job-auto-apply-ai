"use client";

import { useState, useEffect } from "react";
import { AutoScoutLead } from "@/types";
import { ExternalLink, Eye, RefreshCw, Mail, Phone, Globe, CheckCircle2, AlertCircle, Clock, Loader2, Briefcase } from "lucide-react";

import { calculateLocalMatchScore } from "@/utils/score";
import { useAppStore } from "@/lib/store";

export default function FlexibleJobsPage() {
  const [leads, setLeads] = useState<AutoScoutLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedLead, setSelectedLead] = useState<AutoScoutLead | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "best_match">("newest");
  const { signature, autoScoutPreferences } = useAppStore();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auto-scout/leads");
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const isFlexibleJob = (lead: AutoScoutLead) => {
    const text = ((lead.jobTitle || '') + ' ' + (lead.fullDescription || '')).toLowerCase();
    return text.includes('contract') || 
           text.includes('part-time') || 
           text.includes('part time') || 
           text.includes('hourly') || 
           text.includes('freelance') ||
           text.includes('modifier:'); // Matches our new background tag
  };

  const filteredLeads = leads.filter(isFlexibleJob).map(lead => {
    return {
      ...lead,
      _localScore: calculateLocalMatchScore(lead, signature, autoScoutPreferences)
    };
  });

  filteredLeads.sort((a, b) => {
    if (sortBy === "best_match") {
      return (b._localScore || 0) - (a._localScore || 0);
    }
    return b.lastSeenAt - a.lastSeenAt;
  });

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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Briefcase className="text-purple-600" />
            Contract & Flexible Jobs
          </h1>
          <p className="text-gray-500 mt-2">Unified hub for all freelance, part-time, and hourly opportunities found by Auto-Scout.</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value as any)}
            className="border-gray-200 border text-sm rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="newest">Sort by: Newest First</option>
            <option value="best_match">Sort by: Best Match (Resume/Location)</option>
          </select>
          <button onClick={fetchLeads} className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-500" /></div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-20 text-center border rounded-lg bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">No flexible jobs found yet</h3>
          <p className="text-sm text-gray-500 mt-1">The Auto-Pilot will automatically populate this list as it discovers contract and part-time leads.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Job Title & Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Source & Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-purple-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-purple-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900 truncate max-w-[250px]">{lead.jobTitle}</div>
                    <div className="text-sm text-gray-500 truncate max-w-[250px]">{lead.company}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 capitalize font-medium">{lead.source}</div>
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setSelectedLead(lead)} className="text-gray-400 hover:text-purple-600 transition-colors" title="View Full Description">
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
            <div className="px-6 py-4 border-b flex justify-between items-center bg-purple-50">
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

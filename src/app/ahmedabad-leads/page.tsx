"use client";

import { useState, useEffect } from "react";
import { AutoScoutLead } from "@/types";
import { ExternalLink, Eye, RefreshCw, Mail, Phone, Globe, CheckCircle2, AlertCircle, Clock, Loader2, MapPin, Sparkles, Target } from "lucide-react";

export default function AhmedabadLeadsPage() {
  const [leads, setLeads] = useState<AutoScoutLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLead, setSelectedLead] = useState<AutoScoutLead | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "applied" | "no_email" | "failed" | "ignored">("all");

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeads = async () => {
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

  const isAhmedabadLead = (l: AutoScoutLead) => {
    const loc = (l.location || "").toLowerCase();
    const title = (l.jobTitle || "").toLowerCase();
    const desc = (l.fullDescription || "").toLowerCase();
    return loc.includes("ahmedabad") || loc.includes("gujarat") || title.includes("ahmedabad") || desc.includes("ahmedabad") || title.includes("gujarat") || desc.includes("gujarat");
  };

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return isAhmedabadLead(l);
  }).sort((a, b) => b.lastSeenAt - a.lastSeenAt);

  const renderContact = (lead: AutoScoutLead) => {
    if (lead.recipientEmail) return <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium"><Mail size={16}/> {lead.recipientEmail}</div>;
    if (lead.phone) return <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium"><Phone size={16}/> {lead.phone}</div>;
    if (lead.applicationUrl || lead.companyWebsite) return <div className="flex items-center gap-2 text-sm text-fuchsia-600 font-medium"><Globe size={16}/> Website/App</div>;
    return <span className="text-gray-400 text-sm font-medium italic">Pending Extraction</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Premium Header */}
        <div className="relative mb-10 p-8 rounded-2xl overflow-hidden bg-white shadow-xl border border-indigo-100">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <MapPin size={200} className="text-indigo-600" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles size={14} /> High Profile Zone
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Ahmedabad Exclusive
              </h1>
              <p className="text-gray-500 mt-2 text-lg font-medium">Curated leads from Ahmedabad & Gujarat, filtered strictly for you.</p>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-[1px] rounded-xl shadow-md">
                <div className="bg-white px-6 py-4 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <Target size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Discovered</p>
                    <p className="text-3xl font-black text-gray-900">{filteredLeads.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-500">Filter Status:</span>
            <select 
              className="rounded-lg border-gray-200 bg-gray-50 text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm font-medium outline-none py-2 px-4 cursor-pointer"
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">All Ahmedabad Leads</option>
              <option value="new">🌟 New Arrivals</option>
              <option value="applied">✅ Successfully Emailed</option>
              <option value="no_email">⚠️ No Email Found</option>
              <option value="failed">❌ Failed Delivery</option>
            </select>
          </div>
          
          <button onClick={fetchLeads} className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm text-white font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync Leads
          </button>
        </div>

        {/* Leads Grid */}
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin"></div>
              <div className="w-16 h-16 border-4 border-indigo-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
            </div>
            <p className="mt-4 text-indigo-600 font-medium animate-pulse">Scouting Ahmedabad...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <MapPin className="text-gray-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No Ahmedabad leads found</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto font-medium">We haven't discovered any leads in Ahmedabad yet. Keep the Auto-Pilot running and check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <MapPin size={12} /> {lead.location || "Ahmedabad"}
                    </span>
                    
                    {lead.status === 'applied' && <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} className="mr-1"/> Emailed</span>}
                    {lead.status === 'new' && <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700">New</span>}
                    {lead.status === 'no_email' && <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700">No Email</span>}
                    {lead.status === 'failed' && <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700"><AlertCircle size={12} className="mr-1"/> Failed</span>}
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">{lead.jobTitle}</h3>
                  <p className="text-gray-500 font-medium text-sm mb-4">{lead.company}</p>
                  
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    {renderContact(lead)}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-medium text-gray-400">
                    <span className="flex items-center gap-1 capitalize"><Globe size={12}/> {lead.source}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {new Date(lead.lastSeenAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                  <button onClick={() => setSelectedLead(lead)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Details">
                    <Eye size={18} />
                  </button>
                  {lead.recipientEmail && (
                    <a href={`mailto:${lead.recipientEmail}`} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Send Email manually">
                      <Mail size={18} />
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="WhatsApp">
                      <Phone size={18} />
                    </a>
                  )}
                  {lead.jobUrl && (
                    <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-colors" title="Open Link">
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FULL POST MODAL */}
        {selectedLead && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600">{selectedLead.source}</span>
                    <span className="text-gray-400 text-sm font-medium">{new Date(selectedLead.lastSeenAt).toLocaleString()}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">{selectedLead.jobTitle}</h2>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-2 bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors">✕</button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Company</p>
                    <p className="font-bold text-gray-900">{selectedLead.company}</p>
                  </div>
                  <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Location</p>
                    <p className="font-bold text-indigo-900 flex items-center gap-1"><MapPin size={16}/> {selectedLead.location || 'Ahmedabad'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <p className="font-bold text-gray-900 capitalize">{selectedLead.status}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">Contact Information</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</span>
                      {selectedLead.recipientEmail ? (
                        <span className="inline-flex items-center gap-2 font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg"><Mail size={16}/> {selectedLead.recipientEmail}</span>
                      ) : <span className="text-gray-400 font-medium italic">Not available</span>}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Phone Number</span>
                      {selectedLead.phone ? (
                        <span className="inline-flex items-center gap-2 font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"><Phone size={16}/> {selectedLead.phone}</span>
                      ) : <span className="text-gray-400 font-medium italic">Not available</span>}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">Job Description <a href={selectedLead.jobUrl} target="_blank" className="text-indigo-600 hover:text-indigo-700 ml-2" title="Original Post"><ExternalLink size={18}/></a></h3>
                  <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 font-medium shadow-inner">
                    {selectedLead.fullDescription || 'No description available for this lead.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

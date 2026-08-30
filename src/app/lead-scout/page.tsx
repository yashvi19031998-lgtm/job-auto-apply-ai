'use client';

import React, { useState } from 'react';
import { Search, Loader2, Filter, Briefcase, Zap, MapPin } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { LeadCard } from '@/components/lead-scout/LeadCard';
import { Lead } from '@/types/lead';
import { ApifySource } from '@/lib/apify/client';

export default function LeadScoutPage() {
  const { resume } = useAppStore();
  
  const [sources, setSources] = useState<(ApifySource | 'gemini')[]>(['gemini']);
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState<'all' | 'job' | 'freelance'>('all');
  const [useProfile, setUseProfile] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searched, setSearched] = useState(false);

  const availableSources: { id: ApifySource | 'gemini'; name: string; type: 'job' | 'freelance' | 'both' }[] = [
    { id: 'gemini', name: 'Gemini Web Search', type: 'both' },
    { id: 'linkedin', name: 'LinkedIn', type: 'job' },
    { id: 'naukri', name: 'Naukri', type: 'job' },
    { id: 'indeed', name: 'Indeed', type: 'job' },
    { id: 'wellfound', name: 'Wellfound', type: 'job' },
    { id: 'remoteOk', name: 'Remote OK', type: 'job' },
    { id: 'upwork', name: 'Upwork', type: 'freelance' },
    { id: 'freelancer', name: 'Freelancer', type: 'freelance' },
    { id: 'web', name: 'Web', type: 'both' },
  ];

  const handleSourceToggle = (sourceId: ApifySource | 'gemini') => {
    setSources(prev => 
      prev.includes(sourceId) ? prev.filter(s => s !== sourceId) : [...prev, sourceId]
    );
  };

  const handleSearch = async () => {
    if (sources.length === 0) {
      alert('Please select at least one source.');
      return;
    }
    
    setLoading(true);
    setErrors({});
    setSearched(true);
    setLeads([]);

    try {
      const payload = {
        sources,
        keywords,
        location,
        limit: 10,
        profile: useProfile && resume ? resume.parsedText : null
      };

      const res = await fetch('/api/lead-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch leads');
      }

      setLeads(data.leads || []);
      setErrors(data.errors || {});

    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (leadTypeFilter !== 'all' && lead.leadType !== leadTypeFilter) return false;
    if (minMatchScore > 0 && (lead.matchScore === undefined || lead.matchScore < minMatchScore)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lead Scout</h1>
        <p className="text-gray-500 mt-2">Discover job and freelance opportunities tailored to your profile.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Briefcase size={16} /> Lead Type
              </h3>
              <select 
                value={leadTypeFilter}
                onChange={(e) => setLeadTypeFilter(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="all">All</option>
                <option value="job">Jobs</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Filter size={16} /> Sources
              </h3>
              <div className="space-y-2">
                {availableSources.map(source => (
                  <label key={source.id} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={sources.includes(source.id)}
                      onChange={() => handleSourceToggle(source.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{source.name}</span>
                    <span className="ml-auto text-[10px] uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{source.type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-3 rounded-md border border-blue-100">
                <input 
                  type="checkbox"
                  checked={useProfile}
                  onChange={(e) => setUseProfile(e.target.checked)}
                  disabled={!resume}
                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-blue-900 flex items-center gap-1">
                    <Zap size={14} className="text-blue-500 fill-current" /> Use My Profile
                  </span>
                  <span className="text-xs text-blue-700 mt-0.5">
                    {resume ? 'Match leads using your resume skills via AI' : 'Upload a resume first to use this feature'}
                  </span>
                </div>
              </label>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Keywords</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="e.g. React Developer"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full pl-9 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Location</h3>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="e.g. Remote, India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-9 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Min Match Score: {minMatchScore}%</h3>
              <input 
                type="range"
                min="0"
                max="100"
                step="10"
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              {loading ? 'Finding Leads...' : 'Find Leads'}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <h3 className="text-sm font-medium text-red-800">Errors occurred during search:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {Object.entries(errors).map(([source, err]) => (
                  <li key={source}><strong>{source}:</strong> {err}</li>
                ))}
              </ul>
            </div>
          )}

          {!searched ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No leads searched yet</h3>
              <p className="mt-1 text-sm text-gray-500">Select sources and click "Find Leads" to start.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
              <h3 className="mt-4 text-sm font-semibold text-gray-900">Scouting leads...</h3>
              <p className="mt-1 text-sm text-gray-500">Connecting to {sources.length} sources concurrently.</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No leads found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or selecting more sources.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

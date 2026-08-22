"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Briefcase, FileText, Globe, Plus, Settings, CheckCircle2, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { JobApplication } from "@/types";

export default function Dashboard() {
  const router = useRouter();
  const { signature, resume, websites, jobs } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If not setup, redirect to setup
    if (!signature || !resume) {
      router.push("/setup");
    }
  }, [signature, resume, router]);

  if (!mounted || !signature) return null;

  // Filter Jobs
  const sentJobs = jobs.filter(j => j.status === 'sent').sort((a, b) => b.createdAt - a.createdAt);
  const pendingJobs = jobs.filter(j => j.status !== 'sent').sort((a, b) => b.createdAt - a.createdAt);

  const getExternalLink = (job: JobApplication) => {
    if (!job.alternateContact) return null;
    
    if (job.alternateContact.toLowerCase().includes('linkedin.com')) {
      const urlMatch = job.alternateContact.match(/https?:\/\/[^\s]+/);
      return urlMatch ? { type: 'linkedin', url: urlMatch[0] } : null;
    }
    
    if (job.alternateContact.toLowerCase().includes('docs.google.com/forms') || job.alternateContact.toLowerCase().includes('forms.gle')) {
      const urlMatch = job.alternateContact.match(/https?:\/\/[^\s]+/);
      return urlMatch ? { type: 'form', url: urlMatch[0] } : null;
    }

    // Check for ANY other HTTP link
    const anyUrlMatch = job.alternateContact.match(/https?:\/\/[^\s]+/);
    if (anyUrlMatch) {
      return { type: 'link', url: anyUrlMatch[0] };
    }
    
    // Extract numbers only
    const digits = job.alternateContact.replace(/\D/g, '');
    
    // Simple validation for Indian numbers or generic 10+ digits
    if (digits.length >= 10) {
      let waNumber = digits;
      if (waNumber.length === 10) {
        waNumber = "91" + waNumber;
      }
      
      const message = `Hi, I am interested in the ${job.jobTitle || 'open'} role at ${job.company || 'your company'}. I am an Immediate Joiner. Could you please review my profile?`;
      return { type: 'whatsapp', url: `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` };
    }

    // If it has SOME text but doesn't match above, return a generic 'text' type so we can display it!
    if (job.alternateContact.trim().length > 3) {
      return { type: 'text', text: job.alternateContact, url: null };
    }

    return null;
  };

  const renderJobRow = (job: JobApplication) => {
    const externalAction = getExternalLink(job);
    
    return (
      <tr key={job.id} className="hover:bg-gray-50 transition">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{job.jobTitle || "Processing..."}</div>
          <div className="text-sm text-gray-500">{job.company || "Unknown Company"}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
            ${job.status === 'sent' ? 'bg-green-100 text-green-800' : 
              job.status === 'generated' ? 'bg-blue-100 text-blue-800' : 
              'bg-yellow-100 text-yellow-800'}`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(job.createdAt).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-4 h-full pt-6">
          {job.status !== 'sent' && externalAction && externalAction.url && (
            <a href={externalAction.url} target="_blank" rel="noreferrer" 
              className={`flex items-center transition px-3 py-1.5 rounded-lg border 
                ${externalAction.type === 'whatsapp' ? 'text-green-600 hover:text-green-700 bg-green-50 border-green-200' : 
                  externalAction.type === 'linkedin' ? 'text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-200' : 
                  'text-purple-600 hover:text-purple-700 bg-purple-50 border-purple-200'}`}>
              {externalAction.type === 'whatsapp' ? <MessageCircle className="w-4 h-4 mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
              {externalAction.type === 'whatsapp' ? 'WhatsApp' : 
               externalAction.type === 'linkedin' ? 'LinkedIn' : 'Apply Link'}
            </a>
          )}
          {job.status !== 'sent' && externalAction && !externalAction.url && externalAction.type === 'text' && (
             <span className="text-gray-600 text-xs font-medium px-3 py-1.5 bg-gray-100 rounded-lg truncate max-w-[150px] inline-block" title={externalAction.text}>
               {externalAction.text}
             </span>
          )}
          {job.status !== 'sent' && !externalAction && (
             <span className="text-gray-400 text-xs italic px-3 py-1.5 border border-transparent">No contact info</span>
          )}
          <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-900 font-semibold px-3 py-1.5">
            View
          </Link>
        </td>
      </tr>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-12">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Application Assistant</h1>
          <p className="text-gray-500">Welcome back, {signature.fullName.split(' ')[0]}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/jobs/new" className="flex items-center bg-blue-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-800 transition shadow-sm">
            <Plus className="w-5 h-5 mr-2" />
            New Application
          </Link>
          <Link href="/setup" className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 shadow-sm px-4 py-2.5 rounded-xl transition">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><FileText className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1 z-10">Active Resume</p>
          <p className="font-semibold text-gray-900 truncate max-w-[150px] z-10 text-lg">{resume?.name}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Globe className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1 z-10">Websites</p>
          <p className="font-semibold text-gray-900 z-10 text-lg">{websites.length} Configured</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-green-600 opacity-10"><CheckCircle2 className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-green-700 mb-1 z-10">Email Sent</p>
          <p className="font-semibold text-green-900 z-10 text-2xl">{sentJobs.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-orange-600 opacity-10"><Clock className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-orange-700 mb-1 z-10">Pending / Draft</p>
          <p className="font-semibold text-orange-900 z-10 text-2xl">{pendingJobs.length}</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
          <p className="text-gray-500 mb-6">Create your first AI-tailored job application to get started.</p>
          <Link href="/jobs/new" className="inline-flex items-center bg-blue-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-800 transition">
            <Plus className="w-5 h-5 mr-2" />
            Create Application
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          
          {/* EMAIL PENDING SECTION */}
          {pendingJobs.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 text-orange-500 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Email Pending</h2>
                <span className="ml-3 bg-orange-100 text-orange-700 py-1 px-3 rounded-full text-xs font-bold">{pendingJobs.length}</span>
              </div>
              <div className="bg-white border border-orange-100 rounded-2xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-orange-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">Job Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-orange-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {pendingJobs.map(renderJobRow)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EMAIL SENT SECTION */}
          {sentJobs.length > 0 && (
            <div>
              <div className="flex items-center mb-4 mt-8">
                <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Email Sent</h2>
                <span className="ml-3 bg-green-100 text-green-700 py-1 px-3 rounded-full text-xs font-bold">{sentJobs.length}</span>
              </div>
              <div className="bg-white border border-green-100 rounded-2xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-green-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Job Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-green-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sentJobs.map(renderJobRow)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

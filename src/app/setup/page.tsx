"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const { signature, resume, websites, setSignature, setResume, addWebsite, removeWebsite, clearData } = useAppStore();
  
  const [mounted, setMounted] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    portfolioUrl: "",
    linkedinUrl: ""
  });

  const [newWebsite, setNewWebsite] = useState({
    name: "",
    url: "",
    description: ""
  });

  useEffect(() => {
    setMounted(true);
    if (signature) {
      setFormData(signature);
    }
  }, [signature]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResumeFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setResume({
          name: file.name,
          base64Data: base64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddWebsite = () => {
    if (!newWebsite.name || !newWebsite.url) return;
    addWebsite(newWebsite);
    setNewWebsite({ name: "", url: "", description: "" });
  };

  const handleSave = () => {
    setSignature(formData);
    router.push("/");
  };

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Initial Setup</h1>
        <p className="text-gray-500">Configure your professional profile once. All data is saved securely on your device.</p>
      </div>

      <div className="space-y-10">
        {/* Section 1: Resume */}
        <section className="bg-white rounded-2xl shadow-sm border p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
            Upload Resume
          </h2>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition">
            <input 
              type="file" 
              accept=".pdf,.doc,.docx" 
              className="hidden" 
              id="resume-upload" 
              onChange={handleResumeUpload} 
            />
            <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center">
              {resume ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                  <span className="font-medium text-gray-900">{resume.name}</span>
                  <span className="text-sm text-gray-500 mt-1">Click to replace</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-blue-600">Browse for your resume</span>
                  <span className="text-sm text-gray-500 mt-1">PDF, DOC, DOCX</span>
                </>
              )}
            </label>
          </div>
        </section>

        {/* Section 2: Signature */}
        <section className="bg-white rounded-2xl shadow-sm border p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
            Signature Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" className="w-full px-4 py-2 border rounded-lg" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full px-4 py-2 border rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" className="w-full px-4 py-2 border rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" className="w-full px-4 py-2 border rounded-lg" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="City, Country" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
              <input type="url" className="w-full px-4 py-2 border rounded-lg" value={formData.portfolioUrl} onChange={e => setFormData({...formData, portfolioUrl: e.target.value})} placeholder="https://..." />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input type="url" className="w-full px-4 py-2 border rounded-lg" value={formData.linkedinUrl || ""} onChange={e => setFormData({...formData, linkedinUrl: e.target.value})} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>
        </section>

        {/* Section 3: Websites */}
        <section className="bg-white rounded-2xl shadow-sm border p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
            Working / Client Websites
          </h2>
          <p className="text-sm text-gray-500 mb-6">Add projects you've worked on. The AI will automatically select the most relevant one for each application.</p>
          
          <div className="space-y-4 mb-6">
            {websites.map(site => (
              <div key={site.id} className="flex justify-between items-start p-4 border rounded-xl bg-gray-50">
                <div>
                  <h4 className="font-semibold">{site.name}</h4>
                  <a href={site.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{site.url}</a>
                  <p className="text-sm text-gray-600 mt-2">{site.description}</p>
                </div>
                <button onClick={() => removeWebsite(site.id)} className="text-gray-400 hover:text-red-500 p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="border rounded-xl p-5 bg-gray-50/50">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Add New Website</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="Project Name" className="px-4 py-2 border rounded-lg" value={newWebsite.name} onChange={e => setNewWebsite({...newWebsite, name: e.target.value})} />
              <input type="url" placeholder="URL" className="px-4 py-2 border rounded-lg" value={newWebsite.url} onChange={e => setNewWebsite({...newWebsite, url: e.target.value})} />
              <textarea placeholder="Short description of what you worked on..." className="md:col-span-2 px-4 py-2 border rounded-lg" rows={2} value={newWebsite.description} onChange={e => setNewWebsite({...newWebsite, description: e.target.value})} />
            </div>
            <button onClick={handleAddWebsite} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
              <Plus className="w-4 h-4 mr-1" /> Add Website
            </button>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button onClick={handleSave} disabled={!resume || !formData.fullName || !formData.email} className="bg-blue-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-800 transition disabled:opacity-50">
            Save & Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Signature, WorkingWebsite, Resume, JobApplication, AutoScoutPreferences } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface AppState {
  signature: Signature | null;
  resume: Resume | null;
  websites: WorkingWebsite[];
  jobs: JobApplication[];
  autoScoutPreferences: AutoScoutPreferences | null;

  // Actions
  setSignature: (signature: Signature) => void;
  setResume: (resume: Resume) => void;
  setAutoScoutPreferences: (prefs: AutoScoutPreferences) => void;
  
  addWebsite: (website: Omit<WorkingWebsite, "id">) => void;
  updateWebsite: (id: string, website: Omit<WorkingWebsite, "id">) => void;
  removeWebsite: (id: string) => void;

  addJob: (job: Omit<JobApplication, "id" | "createdAt">) => string;
  updateJob: (id: string, updates: Partial<JobApplication>) => void;
  removeJob: (id: string) => void;
  
  clearData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      signature: null,
      resume: null,
      websites: [],
      jobs: [],
      autoScoutPreferences: null,

      setSignature: (signature) => set({ signature }),
      
      setResume: (resume) => set({ resume }),
      
      setAutoScoutPreferences: (prefs) => set({ autoScoutPreferences: prefs }),

      addWebsite: (website) => 
        set((state) => ({
          websites: [...state.websites, { ...website, id: uuidv4() }]
        })),

      updateWebsite: (id, updatedWebsite) =>
        set((state) => ({
          websites: state.websites.map((w) => w.id === id ? { ...w, ...updatedWebsite } : w)
        })),

      removeWebsite: (id) =>
        set((state) => ({
          websites: state.websites.filter((w) => w.id !== id)
        })),

      addJob: (job) => {
        let existingId: string | null = null;
        let isDuplicate = false;
        
        set((state) => {
          if (job.jobUrl) {
            const existing = state.jobs.find(j => j.jobUrl === job.jobUrl);
            if (existing) {
              isDuplicate = true;
              return state;
            }
          }
          if (job.recipientEmail && job.company) {
            const existing = state.jobs.find(j => j.recipientEmail === job.recipientEmail && j.company === job.company);
            if (existing) {
              isDuplicate = true;
              return state;
            }
          }
          const id = uuidv4();
          existingId = id;
          return {
            jobs: [{ ...job, id, createdAt: Date.now() }, ...state.jobs]
          };
        });
        
        if (isDuplicate) {
          throw new Error("This job has already been imported.");
        }
        
        return existingId!;
      },

      updateJob: (id, updates) =>
        set((state) => ({
          jobs: state.jobs.map((j) => j.id === id ? { ...j, ...updates } : j)
        })),

      removeJob: (id) =>
        set((state) => ({
          jobs: state.jobs.filter((j) => j.id !== id)
        })),

      clearData: () => set({ signature: null, resume: null, websites: [], jobs: [] })
    }),
    {
      name: "job-ai-storage",
      version: 1,
    }
  )
);

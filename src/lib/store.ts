import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Signature, WorkingWebsite, Resume, JobApplication } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface AppState {
  signature: Signature | null;
  resume: Resume | null;
  websites: WorkingWebsite[];
  jobs: JobApplication[];

  // Actions
  setSignature: (signature: Signature) => void;
  setResume: (resume: Resume) => void;
  
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

      setSignature: (signature) => set({ signature }),
      
      setResume: (resume) => set({ resume }),

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
        const id = uuidv4();
        set((state) => ({
          jobs: [{ ...job, id, createdAt: Date.now() }, ...state.jobs]
        }));
        return id;
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

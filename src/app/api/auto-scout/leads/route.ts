import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { AutoScoutLead } from '@/types';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'auto_scout_leads.json');

// Ensure database file exists
function initDB() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([]));
  }
}

// Read leads
function getLeads(): AutoScoutLead[] {
  initDB();
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading leads DB:", error);
    return [];
  }
}

// Save leads
function saveLeads(leads: AutoScoutLead[]) {
  initDB();
  fs.writeFileSync(dbPath, JSON.stringify(leads, null, 2));
}

export async function GET() {
  try {
    const leads = getLeads();
    return NextResponse.json({ leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Support saving a single lead or multiple leads
    const incomingLeads: AutoScoutLead[] = Array.isArray(payload) ? payload : [payload];
    const existingLeads = getLeads();
    
    for (const incoming of incomingLeads) {
      if (!incoming.id && !incoming.jobUrl) continue;
      
      const existingIndex = existingLeads.findIndex(l => 
        (l.id && l.id === incoming.id) || 
        (l.jobUrl && l.jobUrl === incoming.jobUrl)
      );
      
      if (existingIndex !== -1) {
        // Update existing (merge), but never revert a success status
        const existingStatus = existingLeads[existingIndex].status;
        const newStatus = incoming.status || existingStatus;
        
        existingLeads[existingIndex] = {
          ...existingLeads[existingIndex],
          ...incoming,
          status: existingStatus === 'applied' ? 'applied' : newStatus, // Protected status
          lastSeenAt: Date.now(),
          firstSeenAt: existingLeads[existingIndex].firstSeenAt || Date.now()
        };
      } else {
        // Add new
        existingLeads.push({
          ...incoming,
          id: incoming.id || `lead-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          status: incoming.status || 'new',
          firstSeenAt: Date.now(),
          lastSeenAt: Date.now()
        });
      }
    }
    
    saveLeads(existingLeads);
    return NextResponse.json({ success: true, count: existingLeads.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

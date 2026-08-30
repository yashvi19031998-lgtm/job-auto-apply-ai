import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const prefsPath = path.join(dataDir, 'auto_scout_prefs.json');

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save signature, resume, preferences, websites to disk for the background worker
    fs.writeFileSync(prefsPath, JSON.stringify(payload, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json({ error: 'No preferences synced' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

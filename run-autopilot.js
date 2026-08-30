const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.AUTOPILOT_BASE_URL || 'http://localhost:3000';
const dataDir = path.join(process.cwd(), 'data');
const prefsPath = path.join(dataDir, 'auto_scout_prefs.json');
const INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours

let isRunning = false;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeStr(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeUrl(url) {
  return (url || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

async function runScan() {
  if (isRunning) return;
  isRunning = true;
  console.log(`\n========================================`);
  console.log(`🚀 STARTING AUTO-PILOT SCAN at ${new Date().toLocaleString()}`);
  console.log(`========================================\n`);

  let stats = { discovered: 0, newLeads: 0, duplicatesSkipped: 0, applicationsSent: 0, noEmail: 0, failed: 0, saved: 0 };

  try {
    try {
      const ping = await fetch(`${BASE_URL}/api/auto-scout/leads`).catch(() => null);
      if (!ping || !ping.ok) throw new Error(`Cannot connect to Next.js server at ${BASE_URL}. Is it running? (npm run dev)`);
    } catch (e) { throw new Error(`Cannot connect to Next.js server at ${BASE_URL}. Is it running?`); }

    if (!fs.existsSync(prefsPath)) throw new Error("Preferences not found. Please visit http://localhost:3000/auto-scout/dashboard first to sync your preferences.");
    
    const state = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    const { signature, resume, websites, autoScoutPreferences: prefs } = state;

    if (!resume || !prefs) throw new Error("Incomplete preferences. Please setup your profile and auto-scout preferences first.");

    console.log(`- Loaded preferences for: ${signature?.fullName || 'User'}`);
    const keywordList = prefs.keywords.split(',').map(k => k.trim()).filter(Boolean);
    const activeKeyword = keywordList[Math.floor(Math.random() * keywordList.length)];
    
    console.log(`- Full Keyword List: ${keywordList.join(', ')}`);
    console.log(`- Selected Keyword for this run: ${activeKeyword} | ${prefs.location} | Source: ${prefs.source}`);

    const existingRes = await fetch(`${BASE_URL}/api/auto-scout/leads`);
    const existingData = await existingRes.json();
    const existingLeads = existingData.leads || [];

    console.log(`\n🔍 Scraping from ${prefs.source}...`);
    const scrapeRes = await fetch(`${BASE_URL}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: activeKeyword, location: prefs.location, searchMode: prefs.mode, searchSource: prefs.source, timeRange: prefs.timeRange })
    });

    if (!scrapeRes.ok) throw new Error(`Scrape failed: ${await scrapeRes.text()}`);

    const scrapeData = await scrapeRes.json();
    const jobs = scrapeData.jobs || [];
    // Uncomment the next line to test with only 3 jobs
    // const jobs = jobs.slice(0, 3);
    stats.discovered = jobs.length;
    console.log(`✅ Found ${jobs.length} potential jobs.`);

    for (let i = 0; i < jobs.length; i++) {
      const rawJob = jobs[i];
      const rawCompany = rawJob.company || 'Unknown';
      console.log(`\n▶ Processing [${i+1}/${jobs.length}]: ${rawJob.title} @ ${rawCompany}`);

      const isDuplicate = existingLeads.some(l => {
        // If the lead matches but its status is 'failed', we DO NOT want to skip it. We want to retry!
        let isMatch = false;
        if (l.jobUrl && (rawJob.url || rawJob.link) && normalizeUrl(l.jobUrl) === normalizeUrl((rawJob.url || rawJob.link))) isMatch = true;
        if (l.jobTitle && l.company && rawJob.title && rawCompany !== 'Unknown') {
          if (normalizeStr(l.jobTitle) === normalizeStr(rawJob.title) && normalizeStr(l.company) === normalizeStr(rawCompany)) isMatch = true;
        }
        
        if (isMatch) {
          // If it failed previously, do not treat as duplicate so we can retry!
          if (l.status === 'failed') return false;
          return true; // It's a duplicate and it was already applied, or it's no_email
        }
        return false;
      });

      if (isDuplicate) {
        console.log(`  ⏭ SKIPPED: Already processed this job previously.`);
        stats.duplicatesSkipped++;
        const matchedLead = existingLeads.find(l => (l.jobUrl && normalizeUrl(l.jobUrl) === normalizeUrl((rawJob.url || rawJob.link))) || (normalizeStr(l.jobTitle) === normalizeStr(rawJob.title) && normalizeStr(l.company) === normalizeStr(rawCompany)));
        if (matchedLead) {
          await fetch(`${BASE_URL}/api/auto-scout/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: matchedLead.id, jobUrl: (rawJob.url || rawJob.link), lastSeenAt: Date.now() })
          });
        }
        continue;
      }

      stats.newLeads++;

      let leadObj = { id: 'lead-' + Date.now() + '-' + Math.floor(Math.random()*1000), source: prefs.source, jobTitle: rawJob.title, company: rawCompany, location: rawJob.location || prefs.location, jobUrl: (rawJob.url || rawJob.link), fullDescription: rawJob.snippet || rawJob.description || '', status: 'new', errorReason: '' };

      try {
        console.log(`  🧠 Extracting contact info & parsing requirements...`);
        const extractText = `Title: ${rawJob.title}\nCompany: ${rawCompany}\nLocation: ${rawJob.location}\nJob Link: ${(rawJob.url || rawJob.link)}\nDescription:\n${rawJob.description || rawJob.snippet || ''}`;
        
        const extRes = await fetch(`${BASE_URL}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractText, inputType: 'scraper' })
        });

        if (!extRes.ok) throw new Error(await extRes.text());
        const extData = await extRes.json();
        const extracted = extData.jobs && extData.jobs.length > 0 ? extData.jobs[0] : null;

        if (extracted) {
          leadObj.recipientEmail = extracted.recipientEmail;
          leadObj.phone = extracted.phone;
          leadObj.applicationUrl = extracted.applicationUrl || extracted.companyWebsite;
          leadObj.recruiterName = extracted.recruiterName;
          if (extracted.requirements) leadObj.fullDescription += '\n\nExtracted Requirements:\n' + extracted.requirements;
        }

        if (!leadObj.recipientEmail) {
          console.log(`  ⚠ NO EMAIL FOUND. Found Phone/Website instead.`);
          leadObj.status = 'no_email';
          stats.noEmail++;
        } else {
          if (!leadObj.recipientEmail.includes('@')) {
            console.log(`  ⚠ INVALID EMAIL EXTRACTED: ${leadObj.recipientEmail}. Marking as no_email.`);
            leadObj.status = 'no_email';
            stats.noEmail++;
          } else {
            console.log(`  ✉ EMAIL FOUND: ${leadObj.recipientEmail}. Generating Cover Letter...`);
          
          // 1. Generate Cover Letter
          const genRes = await fetch(`${BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobDetails: {
                title: leadObj.jobTitle,
                company: leadObj.company,
                requirements: extracted?.requirements || leadObj.fullDescription.substring(0, 500)
              },
              signature,
              resumeBase64: resume.base64Data,
              websites,
              jobType: prefs.mode
            })
          });

          if (!genRes.ok) throw new Error(`Cover Letter Generation Failed: ${await genRes.text()}`);
          const genData = await genRes.json();

          console.log(`  ✉ Sending Application via SMTP...`);

          // 2. Send Application via SMTP
          const sendPayload = {
            to: leadObj.recipientEmail,
            subject: genData.subject,
            body: genData.body,
            resumeBase64: resume.base64Data,
            resumeName: resume.name
          };

          const sendRes = await fetch(`${BASE_URL}/api/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sendPayload) });

          if (!sendRes.ok) throw new Error(`SMTP Error: ${await sendRes.text()}`);
          
          console.log(`  ✅ APPLICATION SENT SUCCESSFULLY!`);
          leadObj.status = 'applied';
          leadObj.appliedAt = Date.now();
          stats.applicationsSent++;
        } // close valid email block
        }
      } catch (jobErr) {
        console.error(`  ❌ FAILED processing job:`, jobErr.message);
        leadObj.status = 'failed';
        leadObj.errorReason = jobErr.message;
        stats.failed++;
      }

      const saveRes = await fetch(`${BASE_URL}/api/auto-scout/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(leadObj) });
      if (!saveRes.ok) console.error("Save failed:", await saveRes.text());
      stats.saved++;
      await sleep(9000); // 9s delay to avoid Gemini 15 RPM rate limit (2 requests per job = 14 req/min)
    }
  } catch (error) { console.error(`\n❌ CRITICAL ERROR IN SCAN:`, error.message); } 
  finally {
    isRunning = false;
    console.log(`\n========================================`);
    console.log(`📊 FINAL REPORT - SCAN COMPLETE`);
    console.log(`========================================`);
    console.log(`Jobs discovered:      ${stats.discovered}`);
    console.log(`Duplicates skipped:   ${stats.duplicatesSkipped}`);
    console.log(`New leads:            ${stats.newLeads}`);
    console.log(`Applications sent:    ${stats.applicationsSent}`);
    console.log(`No-email leads:       ${stats.noEmail}`);
    console.log(`Failed:               ${stats.failed}`);
    console.log(`Saved leads:          ${stats.saved}`);
    console.log(`========================================\n`);
  }
}

setInterval(() => {
  try {
    fs.writeFileSync(path.join(dataDir, 'autopilot_status.json'), JSON.stringify({ status: isRunning ? 'RUNNING' : 'WAITING', timestamp: Date.now() }));
  } catch (e) {}
}, 5000);



if (process.env.GITHUB_ACTIONS) {
  // Run once and exit in GitHub Actions
  console.log("Running in GitHub Actions mode (One-shot execution)...");
  runScan().then(() => {
    console.log("GitHub Actions execution completed.");
    process.exit(0);
  }).catch(err => {
    console.error("Fatal error in GitHub Actions run:", err);
    process.exit(1);
  });
} else {
  // Loop every 2 hours locally
  console.log("Running in Local mode (Continuous execution every 2 hours)...");
  runScan(); // Run immediately first
  setInterval(() => {
    runScan();
  }, INTERVAL_MS);
}

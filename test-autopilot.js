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

// Normalize strings for comparison
function normalizeStr(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function runScan() {
  if (isRunning) return;
  isRunning = true;
  console.log(`\n========================================`);
  console.log(`🚀 STARTING AUTO-PILOT SCAN at ${new Date().toLocaleString()}`);
  console.log(`========================================\n`);

  let stats = {
    discovered: 0,
    newLeads: 0,
    duplicatesSkipped: 0,
    applicationsSent: 0,
    noEmail: 0,
    failed: 0,
    saved: 0
  };

  try {
    // 1. Check if backend is alive
    try {
      const ping = await fetch(`${BASE_URL}/api/auto-scout/leads`).catch(() => null);
      if (!ping || !ping.ok) {
        throw new Error(`Cannot connect to Next.js server at ${BASE_URL}. Is it running? (npm run dev)`);
      }
    } catch (e) {
      throw new Error(`Cannot connect to Next.js server at ${BASE_URL}. Is it running?`);
    }

    // 2. Load preferences
    if (!fs.existsSync(prefsPath)) {
      throw new Error("Preferences not found. Please visit http://localhost:3000/auto-scout/dashboard first to sync your preferences.");
    }
    const state = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    const { signature, resume, websites, autoScoutPreferences: prefs } = state;

    if (!resume || !prefs) {
      throw new Error("Incomplete preferences. Please setup your profile and auto-scout preferences first.");
    }

    console.log(`- Loaded preferences for: ${signature?.fullName || 'User'}`);
    console.log(`- Search Config: ${prefs.keywords} | ${prefs.location} | Source: ${prefs.source}`);

    // 3. Load existing leads for duplicate protection
    const existingRes = await fetch(`${BASE_URL}/api/auto-scout/leads`);
    const existingData = await existingRes.json();
    const existingLeads = existingData.leads || [];

    // 4. SCRAPE
    console.log(`\n🔍 Scraping from ${prefs.source}...`);
    const scrapeRes = await fetch(`${BASE_URL}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: prefs.keywords,
        location: prefs.location,
        searchMode: prefs.mode,
        searchSource: prefs.source,
        timeRange: prefs.timeRange
      })
    });

    if (!scrapeRes.ok) {
      const err = await scrapeRes.text();
      throw new Error(`Scrape failed: ${err}`);
    }

    const scrapeData = await scrapeRes.json();
    const jobs = scrapeData.jobs || [];
    // TRUNCATE JOBS FOR TEST ONLY to speed up
    const testJobs = jobs.slice(0, 3);
    stats.discovered = testJobs.length;
    console.log(`✅ Found ${jobs.length} potential jobs. Testing with first ${testJobs.length}.`);

    // 5. Process each job
    for (let i = 0; i < testJobs.length; i++) {
      const rawJob = testJobs[i];
      console.log(`\n▶ Processing [${i+1}/${testJobs.length}]: ${rawJob.title} @ ${rawJob.company || 'Unknown'}`);

      // DUPLICATE PROTECTION
      const isDuplicate = existingLeads.some(l => {
        if (l.jobUrl && rawJob.link && l.jobUrl === rawJob.link) return true;
        if (l.jobTitle && l.company && rawJob.title && rawJob.company) {
          if (normalizeStr(l.jobTitle) === normalizeStr(rawJob.title) && 
              normalizeStr(l.company) === normalizeStr(rawJob.company)) {
            return true;
          }
        }
        return false;
      });

      if (isDuplicate) {
        console.log(`  ⏭ SKIPPED: Already processed this job previously.`);
        stats.duplicatesSkipped++;
        // Update lastSeenAt silently
        const matchedLead = existingLeads.find(l => (l.jobUrl === rawJob.link) || (normalizeStr(l.jobTitle) === normalizeStr(rawJob.title) && normalizeStr(l.company) === normalizeStr(rawJob.company)));
        if (matchedLead) {
          await fetch(`${BASE_URL}/api/auto-scout/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: matchedLead.id, jobUrl: rawJob.link, lastSeenAt: Date.now() })
          });
        }
        continue;
      }

      stats.newLeads++;

      // Create a base lead object
      let leadObj = {
        source: prefs.source,
        jobTitle: rawJob.title,
        company: rawJob.company || 'Unknown',
        location: rawJob.location || prefs.location,
        jobUrl: rawJob.link,
        fullDescription: rawJob.snippet || rawJob.description || '',
        status: 'new',
        errorReason: ''
      };

      try {
        // EXTRACT CONTACT INFO & MATCH
        console.log(`  🧠 Extracting contact info & parsing requirements...`);
        const extractText = `
Title: ${rawJob.title}
Company: ${rawJob.company}
Location: ${rawJob.location}
Job Link: ${rawJob.link}

Description:
${rawJob.description || rawJob.snippet || ''}
        `;

        const extRes = await fetch(`${BASE_URL}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractText, inputType: 'scraper' })
        });

        if (!extRes.ok) {
          let errText = "Failed to extract details via AI";
          try {
             errText = await extRes.text();
          } catch(e){}
          throw new Error(errText);
        }
        const extData = await extRes.json();
        
        const extracted = extData.jobs && extData.jobs.length > 0 ? extData.jobs[0] : null;

        if (extracted) {
          leadObj.recipientEmail = extracted.recipientEmail;
          leadObj.phone = extracted.phone;
          leadObj.applicationUrl = extracted.applicationUrl || extracted.companyWebsite;
          leadObj.recruiterName = extracted.recruiterName;
          if (extracted.requirements) leadObj.fullDescription += '\n\nExtracted Requirements:\n' + extracted.requirements;
        }

        // IF NO EMAIL, mark as no_email and save
        if (!leadObj.recipientEmail) {
          console.log(`  ⚠ NO EMAIL FOUND. Found Phone/Website instead.`);
          leadObj.status = 'no_email';
          stats.noEmail++;
        } else {
          // IF EMAIL FOUND, SEND APPLICATION
          console.log(`  ✉ EMAIL FOUND: ${leadObj.recipientEmail}. Preparing application...`);
          
          const sendPayload = {
            jobType: prefs.mode,
            jobTitle: leadObj.jobTitle,
            company: leadObj.company,
            recipientEmail: leadObj.recipientEmail,
            requirements: extracted?.requirements || leadObj.fullDescription.substring(0, 500),
            signature: signature,
            resume: resume,
            selectedWebsiteId: websites && websites.length > 0 ? websites[0].id : null,
            websites: websites
          };

          const sendRes = await fetch(`${BASE_URL}/api/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sendPayload)
          });

          if (!sendRes.ok) {
            const sendErr = await sendRes.json();
            throw new Error(`SMTP Error: ${sendErr.error || 'Failed to send'}`);
          }

          console.log(`  ✅ APPLICATION SENT SUCCESSFULLY!`);
          leadObj.status = 'applied';
          leadObj.appliedAt = Date.now();
          stats.applicationsSent++;
        }

      } catch (jobErr) {
        console.error(`  ❌ FAILED processing job:`, jobErr.message);
        leadObj.status = 'failed';
        leadObj.errorReason = jobErr.message;
        stats.failed++;
      }

      // SAVE LEAD PERSISTENTLY
      await fetch(`${BASE_URL}/api/auto-scout/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadObj)
      });
      stats.saved++;

      await sleep(1000);
    }

  } catch (error) {
    console.error(`\n❌ CRITICAL ERROR IN SCAN:`, error.message);
  } finally {
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

// START IMMEDIATELY (TEST MODE - NO LOOP)
runScan();

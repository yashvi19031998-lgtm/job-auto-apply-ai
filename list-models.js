require("dotenv").config({ path: "e:/MyWork/job-auto-apply-ai/.env.local" });

async function list() {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + process.env.GEMINI_API_KEY);
    const json = await res.json();
    console.log(json.models.map(m => m.name));
  } catch (e) {
    console.error(e);
  }
}
list();

const google = require('googlethis');
async function test() {
  try {
    const res = await google.search("site:naukri.com/job-listings React Developer", { page: 0, safe: false, additional_params: { hl: 'en' } });
    console.log("Naukri results:", res.results.length);
  } catch (e) {
    console.log("Naukri error:", e.message);
  }
}
test();

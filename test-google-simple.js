const google = require('googlethis');
async function test() {
  try {
    const res = await google.search("React Developer", { page: 0, safe: false, additional_params: { hl: 'en' } });
    console.log("Results count:", res.results.length);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

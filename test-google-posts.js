const google = require('googlethis');

async function test() {
  const query = 'site:linkedin.com/posts/ "hiring" "React Developer"';
  const options = { page: 0, safe: false, additional_params: { hl: 'en' } };
  try {
    const res = await google.search(query, options);
    console.log(res.results.slice(0, 3));
  } catch(e) {
    console.log(e.message);
  }
}
test();

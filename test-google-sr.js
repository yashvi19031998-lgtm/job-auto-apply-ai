const { search } = require('google-sr');

async function test() {
  try {
    const results = await search({ query: "React Developer Remote" });
    console.log("google-sr results:", results.length);
    console.log(results.slice(0, 2));
  } catch(e) {
    console.log("google-sr error:", e.message);
  }
}
test();

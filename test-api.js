async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/lead-scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: ["gemini"],
        keywords: "React Developer",
        location: "India"
      })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();

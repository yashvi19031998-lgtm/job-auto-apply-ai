async function test() {
  const query = "Unicorn Infotech Consulting Services";
  const res = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`);
  const data = await res.json();
  console.log("Clearbit:", data);
}
test();

async function test() {
  const res = await fetch("https://www.naukri.com/jobapi/v3/search?noOfResults=20&urlType=search_by_keyword&searchType=adv&keyword=react&pageNo=1", {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'appid': '109',
      'systemid': '109'
    }
  });
  console.log("Status:", res.status);
  const json = await res.text();
  console.log("Length:", json.length);
  console.log("Preview:", json.slice(0, 100));
}
test();

import { POST } from './src/app/api/scrape/route';

async function run() {
  const sources = ['linkedin', 'naukri', 'indeed', 'web', 'custom'];
  for (const source of sources) {
     console.log(`\nTesting ${source}...`);
     const req = {
       json: async () => ({
         keywords: "React Developer",
         location: "Remote",
         searchMode: "fulltime",
         searchSource: source,
         timeRange: "past_week"
       })
     };
     
     const res = await POST(req as any);
     console.log("Status:", res.status);
     const data = await res.json();
     if (data.jobs) {
       console.log(`Jobs: ${data.jobs.length}`);
       data.jobs.slice(0, 3).forEach((j: any, i: number) => console.log(` ${i+1}. [${j.company}] ${j.title}\n    URL: ${j.url}`));
     } else {
       console.log("Error:", data.error);
     }
  }
}
run();

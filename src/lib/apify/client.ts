import { ApifyClient } from 'apify-client';

const apifyToken = process.env.APIFY_API_TOKEN;

export const apifyClient = apifyToken ? new ApifyClient({ token: apifyToken }) : null;

// Actor IDs from environment
export const ACTORS = {
  linkedin: process.env.APIFY_ACTOR_LINKEDIN || 'curious_coder/linkedin-jobs-scraper',
  upwork: process.env.APIFY_ACTOR_UPWORK || 'upwork-scraper/upwork-jobs',
  naukri: process.env.APIFY_ACTOR_NAUKRI || 'naukri-scraper/naukri-jobs',
  indeed: process.env.APIFY_ACTOR_INDEED || 'indeed-scraper/indeed-jobs',
  freelancer: process.env.APIFY_ACTOR_FREELANCER || 'freelancer-scraper/freelancer-jobs',
  wellfound: process.env.APIFY_ACTOR_WELLFOUND || 'wellfound-scraper/wellfound-jobs',
  remoteOk: process.env.APIFY_ACTOR_REMOTEOK || 'remoteok-scraper/remoteok-jobs',
  web: process.env.APIFY_ACTOR_WEB || 'apify/google-search-scraper',
};

export type ApifySource = keyof typeof ACTORS;

export interface ApifySearchParams {
  keywords?: string;
  location?: string;
  limit?: number;
}

export async function runApifyActor(source: ApifySource, params: ApifySearchParams) {
  if (!apifyClient) {
    throw new Error('APIFY_API_TOKEN is not configured');
  }

  const actorId = ACTORS[source];
  if (!actorId) {
    throw new Error(`No actor configured for source: ${source}`);
  }

  // --- MOCK MODE FOR LINKEDIN (Reads from saved dataset to save credits) ---
  if (source === 'linkedin') {
    console.log('Mock Mode: Pulling from existing dataset Zcp504ZyefC0ddmNB to save credits...');
    try {
      const { items } = await apifyClient.dataset('Zcp504ZyefC0ddmNB').listItems({
        limit: params.limit || 50,
      });
      return items;
    } catch (e) {
      console.error('Error fetching from saved dataset', e);
      throw e;
    }
  }
  // --------------------------------------------------------------------------

  // Map our generic search params to actor-specific inputs
  let input: any = {};
  
  if (source === 'upwork') {
    input = {
      query: params.keywords || '',
      location: params.location || '',
      limit: params.limit || 10,
    };
  } else if (source === 'web') {
    // Official apify/google-search-scraper requires "queries"
    input = {
      queries: `${params.keywords || ''} ${params.location || ''} jobs`.trim(),
      maxPagesPerQuery: 1,
      resultsPerPage: params.limit || 10,
    };
  } else {
    // Generic fallback for others
    input = {
      query: `${params.keywords || ''} ${params.location || ''}`.trim(),
      maxResults: params.limit || 10,
    };
  }

  try {
    const run = await apifyClient.actor(actorId).call(input);
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    return items;
  } catch (error) {
    console.error(`Error running Apify actor for ${source}:`, error);
    throw error;
  }
}

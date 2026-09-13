import { AutoScoutLead, AutoScoutPreferences, Signature } from "@/types";

export function calculateLocalMatchScore(
  lead: AutoScoutLead, 
  signature: Signature | null, 
  prefs: AutoScoutPreferences | null
): number {
  let score = 0;
  const title = (lead.jobTitle || '').toLowerCase();
  const desc = (lead.fullDescription || '').toLowerCase();
  const loc = (lead.location || '').toLowerCase();

  // Location match
  if (signature?.location) {
    const userLocParts = signature.location.toLowerCase().split(',');
    const userCity = userLocParts[0]?.trim();
    const userStateOrCountry = userLocParts[1]?.trim();

    if (userCity && loc.includes(userCity)) {
      score += 50; // Big boost for exact city match
    } else if (userStateOrCountry && loc.includes(userStateOrCountry)) {
      score += 30; // Boost for state/country match
    } else if (loc.includes('remote') || loc.includes('anywhere')) {
      score += 40; // Good boost for remote
    } else if (loc.includes('hybrid')) {
      score += 20; // Small boost for hybrid
    }
  } else if (loc.includes('remote') || loc.includes('hybrid')) {
    score += 20;
  }

  // Keyword / Role match
  const roles = prefs?.targetRoles || [];
  const otherKeywords = prefs?.keywords?.split(',').map(k => k.trim()) || [];
  const allKeywords = [...roles, ...otherKeywords].filter(Boolean);

  let kwMatched = 0;
  for (const keyword of allKeywords) {
    const kw = keyword.toLowerCase();
    if (!kw || kw.length < 3) continue;

    if (title.includes(kw)) {
      score += 30;
      kwMatched++;
    }
    if (desc.includes(kw)) {
      score += 10;
      kwMatched++;
    }
  }

  // Give a small penalty if it doesn't match any keywords at all, to push generic jobs down
  if (kwMatched === 0 && allKeywords.length > 0) {
    score -= 20;
  }

  return score;
}

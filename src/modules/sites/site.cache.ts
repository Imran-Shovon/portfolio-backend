import { SiteModel } from "@/modules/sites/site.model";

const TTL_MS = 60_000;

interface Entry {
  allowedOrigins: string[];
  expires: number;
}

const cache = new Map<string, Entry>();

/**
 * Allowed contact-form origins for a site slug, cached for 60s because CORS runs on every
 * preflight. Unknown or inactive sites have no allowed origins.
 */
export async function getAllowedOrigins(slug: string): Promise<string[]> {
  const hit = cache.get(slug);
  if (hit && hit.expires > Date.now()) return hit.allowedOrigins;

  const site = await SiteModel.findOne({ slug, active: true }).select("allowedOrigins").lean();
  const allowedOrigins = site?.allowedOrigins ?? [];
  cache.set(slug, { allowedOrigins, expires: Date.now() + TTL_MS });
  return allowedOrigins;
}

export function clearSiteCache(slug?: string) {
  if (slug) cache.delete(slug);
  else cache.clear();
}

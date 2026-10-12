import { logger } from "@/lib/logger";
import { SiteModel } from "@/modules/sites/site.model";

const DEBOUNCE_MS = 500;
const TIMEOUT_MS = 5000;
const pending = new Map<string, NodeJS.Timeout>();

export interface RevalidateResult {
  ok: boolean;
  /** The website's HTTP status, or 0 when it couldn't be reached. */
  status: number;
}

/** POSTs to the site's revalidate URL with its secret. Never throws. */
export async function revalidateNow(siteId: string): Promise<RevalidateResult> {
  const site = await SiteModel.findById(siteId).select("+revalidateSecret");
  if (!site?.revalidateUrl) return { ok: false, status: 0 };

  try {
    const res = await fetch(site.revalidateUrl, {
      method: "POST",
      headers: { "x-revalidate-secret": site.revalidateSecret },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) logger.warn({ site: site.slug, status: res.status }, "Website revalidation was rejected");
    return { ok: res.ok, status: res.status };
  } catch (err) {
    logger.warn({ site: site.slug, err: (err as Error).message }, "Website revalidation failed");
    return { ok: false, status: 0 };
  }
}

/**
 * Fire-and-forget after an admin write. Debounced per site so a reorder or a burst of edits
 * sends one request. Admin requests never wait for or fail because of it.
 */
export function scheduleRevalidate(site: { _id: unknown; revalidateUrl?: string | null }) {
  if (!site.revalidateUrl) return;
  const siteId = String(site._id);
  clearTimeout(pending.get(siteId));
  pending.set(
    siteId,
    setTimeout(() => {
      pending.delete(siteId);
      void revalidateNow(siteId);
    }, DEBOUNCE_MS).unref(),
  );
}

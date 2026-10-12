import { waitUntil } from "@vercel/functions";
import { logger } from "@/lib/logger";
import { SiteModel } from "@/modules/sites/site.model";

const DEBOUNCE_MS = 500;
const TIMEOUT_MS = 5000;
const pending = new Set<string>();

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
 * Fire-and-forget after an admin write: pings the website 500ms later, so a reorder or a burst
 * of edits arriving in that window shares one request. Admin requests never wait for or fail
 * because of it. `waitUntil` keeps a serverless function (Vercel) alive until the ping is done;
 * on a long-running server it simply lets the promise run.
 */
export function scheduleRevalidate(site: { _id: unknown; revalidateUrl?: string | null }) {
  if (!site.revalidateUrl) return;
  const siteId = String(site._id);
  if (pending.has(siteId)) return;
  pending.add(siteId);
  waitUntil(
    new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS))
      .then(() => {
        pending.delete(siteId);
        return revalidateNow(siteId);
      })
      .catch(err => logger.warn({ err, siteId }, "Revalidation scheduling failed")),
  );
}

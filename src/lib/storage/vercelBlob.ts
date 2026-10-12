import { del, list, put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import type { StorageDriver } from "@/lib/storage/types";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const siteFolder = (siteId: string) => `${env.STORAGE_FOLDER}/${siteId}/`;

/**
 * True for `https://<store>.public.blob.vercel-storage.com/<folder>/<siteId>/<file>` URLs in this
 * service's folder. Anything else (seeded /image/... paths, other hosts) is never deleted.
 */
export function isOwnedBlobUrl(url: string, folder: string) {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname);
    return u.protocol === "https:" && u.hostname.endsWith(BLOB_HOST_SUFFIX) && path.startsWith(`/${folder}/`) && !path.includes("..");
  } catch {
    return false;
  }
}

/** Vercel Blob (public store). Credentials come from BLOB_READ_WRITE_TOKEN, which the SDK reads. */
export const vercelBlobDriver: StorageDriver = {
  async save(siteId, buffer, kind) {
    const blob = await put(`${siteFolder(siteId)}${nanoid(16)}.${kind.ext}`, buffer, {
      access: "public",
      contentType: kind.ext === "pdf" ? "application/pdf" : `image/${kind.ext === "jpg" ? "jpeg" : kind.ext}`,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return blob.url;
  },

  async remove(url) {
    if (!isOwnedBlobUrl(url, env.STORAGE_FOLDER)) return;
    try {
      await del(url);
    } catch (err) {
      logger.warn({ err, url }, "Could not delete blob");
    }
  },

  async removeSite(siteId) {
    try {
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: siteFolder(siteId), cursor, limit: 1000 });
        if (page.blobs.length) await del(page.blobs.map(b => b.url));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    } catch (err) {
      logger.warn({ err, siteId }, "Could not delete blobs for site");
    }
  },
};

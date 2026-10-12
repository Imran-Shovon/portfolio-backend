import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import type { StorageDriver } from "@/lib/storage/types";

/** Files live in `<UPLOAD_DIR>/<siteId>/` and are served by express.static at `/uploads`. */
export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);
const PUBLIC_PREFIX = `${env.PUBLIC_BASE_URL}/uploads/`;

/** The local path of a file this service owns, or null for anything else (e.g. /image/... paths). */
export function ownedFilePath(url: string): string | null {
  let relative: string;
  if (url.startsWith(PUBLIC_PREFIX)) relative = url.slice(PUBLIC_PREFIX.length);
  else if (url.startsWith("/uploads/")) relative = url.slice("/uploads/".length);
  else return null;

  const resolved = path.resolve(UPLOAD_ROOT, relative);
  // Refuse anything that escapes the upload folder (../ tricks).
  return resolved.startsWith(UPLOAD_ROOT + path.sep) ? resolved : null;
}

export const localDriver: StorageDriver = {
  async save(siteId, buffer, kind) {
    const dir = path.join(UPLOAD_ROOT, siteId);
    const name = `${nanoid(16)}.${kind.ext}`;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);
    return `${PUBLIC_PREFIX}${siteId}/${name}`;
  },

  async remove(url) {
    const file = ownedFilePath(url);
    if (!file) return;
    try {
      await unlink(file);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") logger.warn({ err, url }, "Could not delete upload");
    }
  },

  async removeSite(siteId) {
    await rm(path.join(UPLOAD_ROOT, siteId), { recursive: true, force: true });
  },
};

import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { env } from "@/config/env";
import { AppError } from "@/lib/AppError";
import { logger } from "@/lib/logger";

const MB = 1024 * 1024;

interface FileKind {
  ext: string;
  maxBytes: number;
  /** Checks the file's leading bytes so a renamed file can't pass as another type. */
  sniff: (b: Buffer) => boolean;
}

const ascii = (b: Buffer, start: number, text: string) => b.subarray(start, start + text.length).toString("latin1") === text;

export const FILE_KINDS: Record<string, FileKind> = {
  "image/jpeg": { ext: "jpg", maxBytes: 5 * MB, sniff: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", maxBytes: 5 * MB, sniff: b => ascii(b, 1, "PNG") && b[0] === 0x89 },
  "image/webp": { ext: "webp", maxBytes: 5 * MB, sniff: b => ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP") },
  "image/avif": { ext: "avif", maxBytes: 5 * MB, sniff: b => ascii(b, 4, "ftyp") && (ascii(b, 8, "avif") || ascii(b, 8, "avis")) },
  "application/pdf": { ext: "pdf", maxBytes: 10 * MB, sniff: b => ascii(b, 0, "%PDF") },
};

/** Largest allowed upload, used as multer's hard limit. */
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(FILE_KINDS).map(k => k.maxBytes));

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);
const PUBLIC_PREFIX = `${env.PUBLIC_BASE_URL}/uploads/`;

/**
 * Files live in `uploads/<siteId>/`. Folders are keyed by id rather than slug so renaming a
 * site never strands its files, and deleting a site can remove its folder in one go.
 */
export async function saveUpload(siteId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
  const kind = FILE_KINDS[file.mimetype];
  if (!kind) {
    throw new AppError(415, "UNSUPPORTED_FILE", "Use a JPEG, PNG, WebP or AVIF image, or a PDF");
  }
  if (file.size > kind.maxBytes) {
    throw new AppError(413, "FILE_TOO_LARGE", `This file type can be at most ${kind.maxBytes / MB} MB`);
  }
  if (!kind.sniff(file.buffer)) {
    throw new AppError(415, "UNSUPPORTED_FILE", "The file's contents don't match its type");
  }

  const dir = path.join(UPLOAD_ROOT, siteId);
  const name = `${nanoid(16)}.${kind.ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), file.buffer);
  return `${PUBLIC_PREFIX}${siteId}/${name}`;
}

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

export async function removeUpload(url: string | undefined | null) {
  if (!url) return;
  const file = ownedFilePath(url);
  if (!file) return;
  try {
    await unlink(file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") logger.warn({ err, url }, "Could not delete upload");
  }
}

/** Deletes files that a field pointed at before an update but no longer does. */
export async function removeReplacedUploads(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  fields: readonly string[],
) {
  if (!before) return;
  await Promise.all(
    fields.map(f => {
      const old = before[f];
      return typeof old === "string" && old !== after?.[f] ? removeUpload(old) : undefined;
    }),
  );
}

export async function removeSiteUploads(siteId: string) {
  await rm(path.join(UPLOAD_ROOT, siteId), { recursive: true, force: true });
}

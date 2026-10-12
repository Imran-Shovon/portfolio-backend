import { env } from "@/config/env";
import { AppError } from "@/lib/AppError";
import { cloudinaryDriver } from "@/lib/storage/cloudinary";
import { localDriver } from "@/lib/storage/local";
import type { FileKind, StorageDriver } from "@/lib/storage/types";

export { ownedFilePath, UPLOAD_ROOT } from "@/lib/storage/local";

const MB = 1024 * 1024;

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

/** Chosen by STORAGE_DRIVER: local disk in development, Cloudinary in production. */
const driver: StorageDriver = env.STORAGE_DRIVER === "cloudinary" ? cloudinaryDriver : localDriver;

/**
 * Validates type, size and contents, then stores the file under the site's folder
 * (keyed by id so renaming a site never strands its files). Returns the public URL.
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
  return driver.save(siteId, file.buffer, kind);
}

/** Deletes a file this service stored. URLs it doesn't own (e.g. /image/... paths) are ignored. */
export async function removeUpload(url: string | undefined | null) {
  if (url) await driver.remove(url);
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
  await driver.removeSite(siteId);
}

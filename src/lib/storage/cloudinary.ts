import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { nanoid } from "nanoid";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import type { FileKind, StorageDriver } from "@/lib/storage/types";

type ResourceType = "image" | "raw";

let configured = false;

/** Configured lazily from CLOUDINARY_URL so local development never needs Cloudinary. */
function client() {
  if (!configured) {
    const url = new URL(env.CLOUDINARY_URL);
    cloudinary.config({
      cloud_name: url.hostname,
      api_key: decodeURIComponent(url.username),
      api_secret: decodeURIComponent(url.password),
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

const cloudName = () => new URL(env.CLOUDINARY_URL).hostname;
const siteFolder = (siteId: string) => `${env.CLOUDINARY_FOLDER}/${siteId}`;

/**
 * Images are stored as Cloudinary "image" resources (CDN-optimized). PDFs are "raw" resources,
 * because Cloudinary blocks delivering PDFs uploaded as images on free accounts by default.
 */
const resourceTypeOf = (kind: FileKind): ResourceType => (kind.ext === "pdf" ? "raw" : "image");

/**
 * `https://res.cloudinary.com/<cloud>/<image|raw>/upload/v123/<folder>/<siteId>/<name>[.ext]`
 * → the public id and resource type, but only for files in this account's upload folder.
 */
export function parseCloudinaryUrl(url: string, cloud: string, folder: string): { publicId: string; resourceType: ResourceType } | null {
  const match = url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|raw)\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match || match[1] !== cloud) return null;
  const resourceType = match[2] as ResourceType;
  const path = decodeURIComponent(match[3]!);
  if (!path.startsWith(`${folder}/`) || path.includes("..")) return null;
  // Image public ids exclude the extension; raw ones include it.
  const publicId = resourceType === "image" ? path.replace(/\.[^./]+$/, "") : path;
  return { publicId, resourceType };
}

export const cloudinaryDriver: StorageDriver = {
  async save(siteId, buffer, kind) {
    const resourceType = resourceTypeOf(kind);
    const name = nanoid(16);
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      client()
        .uploader.upload_stream(
          {
            folder: siteFolder(siteId),
            public_id: resourceType === "raw" ? `${name}.${kind.ext}` : name,
            resource_type: resourceType,
            overwrite: false,
          },
          (err, res) => (err || !res ? reject(err ?? new Error("Empty Cloudinary response")) : resolve(res)),
        )
        .end(buffer);
    });
    return result.secure_url;
  },

  async remove(url) {
    const parsed = parseCloudinaryUrl(url, cloudName(), env.CLOUDINARY_FOLDER);
    if (!parsed) return;
    try {
      await client().uploader.destroy(parsed.publicId, { resource_type: parsed.resourceType, invalidate: true });
    } catch (err) {
      logger.warn({ err, url }, "Could not delete Cloudinary upload");
    }
  },

  async removeSite(siteId) {
    const prefix = `${siteFolder(siteId)}/`;
    for (const resource_type of ["image", "raw"] as const) {
      try {
        await client().api.delete_resources_by_prefix(prefix, { resource_type });
      } catch (err) {
        logger.warn({ err, siteId, resource_type }, "Could not delete Cloudinary uploads for site");
      }
    }
  },
};

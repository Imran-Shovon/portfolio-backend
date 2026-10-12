import { z } from "zod";

/**
 * Shared Mongoose options: timestamps, and JSON with `id` instead of `_id`, no `__v`, no `siteId`
 * (clients always know which site they asked for), and none of the `hide` fields (secrets).
 */
export function baseSchemaOptions({ hide = [] }: { hide?: string[] } = {}) {
  return {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.siteId;
        for (const field of hide) delete ret[field];
        return ret;
      },
    },
  };
}

// ── Zod building blocks shared by every module ──────────────────────────

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const idParams = z.object({ id: objectId });

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const hexColor = z.string().trim().regex(HEX_RE, "Use a 6-digit hex color like #3b82f6");

export const text = (max = 500) => z.string().trim().max(max);
export const requiredText = (max = 500) => z.string().trim().min(1, "Required").max(max);

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

/** A full URL, a root-relative path (/image/...), or "" (meaning "hide it"). Never "#". */
export const urlOrPath = z
  .string()
  .trim()
  .max(2048)
  .refine(v => v === "" || (v.startsWith("/") && !v.startsWith("//")) || isHttpUrl(v), "Enter a full URL, a path starting with /, or leave it empty");

export const absoluteUrl = z.string().trim().max(2048).refine(isHttpUrl, "Enter a full URL starting with https://");

export const tagList = z.array(z.string().trim().min(1).max(80)).max(100);

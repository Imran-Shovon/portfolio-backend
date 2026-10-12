import { z } from "zod";
import { absoluteUrl, requiredText } from "@/lib/schema";
import { SECTION_KEYS, type SectionKey } from "@/modules/sites/site.model";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{2,40}$/, "2–40 characters: lowercase letters, numbers and hyphens");

const origin = z
  .string()
  .trim()
  .refine(v => {
    try {
      return new URL(v).origin === v;
    } catch {
      return false;
    }
  }, "Each origin must look like https://example.com (no path or trailing slash)");

const sectionsSchema = z
  .object(Object.fromEntries(SECTION_KEYS.map(k => [k, z.boolean()])) as Record<SectionKey, z.ZodBoolean>)
  .strict();

const siteFields = z.object({
  name: requiredText(100),
  slug: slugSchema,
  siteUrl: absoluteUrl,
  allowedOrigins: z.array(origin).max(20),
  revalidateUrl: z.union([z.literal(""), absoluteUrl]),
  sections: sectionsSchema,
});

export const createSiteSchema = siteFields
  .extend({
    allowedOrigins: siteFields.shape.allowedOrigins.default([]),
    revalidateUrl: siteFields.shape.revalidateUrl.default(""),
    sections: sectionsSchema.optional(),
  })
  .strict();

// Built from the default-free fields: in Zod 4 defaults still fire inside .partial(), which
// would reset omitted fields on every PATCH.
export const updateSiteSchema = siteFields.extend({ active: z.boolean() }).partial().strict();

export const deleteSiteQuery = z.object({ confirm: z.string() });

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;

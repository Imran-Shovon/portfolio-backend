import { model, Schema, type HydratedDocument } from "mongoose";
import { baseSchemaOptions } from "@/lib/schema";

export const SECTION_KEYS = ["skills", "experience", "projects", "education", "publications"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export type Sections = Record<SectionKey, boolean>;

export interface Site {
  name: string;
  slug: string;
  siteUrl: string;
  allowedOrigins: string[];
  revalidateUrl: string;
  revalidateSecret: string;
  sections: Sections;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sectionsSchema = new Schema<Sections>(
  Object.fromEntries(SECTION_KEYS.map(k => [k, { type: Boolean, default: true }])),
  { _id: false },
);

const siteSchema = new Schema<Site>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]{2,40}$/ },
    siteUrl: { type: String, required: true, trim: true },
    allowedOrigins: { type: [String], default: [] },
    revalidateUrl: { type: String, default: "" },
    revalidateSecret: { type: String, required: true, select: false },
    sections: { type: sectionsSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions({ hide: ["revalidateSecret"] }),
);


export type SiteDoc = HydratedDocument<Site>;
export const SiteModel = model<Site>("Site", siteSchema);

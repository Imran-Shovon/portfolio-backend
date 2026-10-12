import { model, Schema, type InferSchemaType } from "mongoose";
import { baseSchemaOptions } from "@/lib/schema";
import { siteScopePlugin } from "@/lib/siteScope";

export const SOCIAL_PLATFORMS = ["github", "linkedin", "researchgate", "email", "other"] as const;

const str = { type: String, default: "" };

/** One per site. Everything the Hero, About, Contact, Footer, loader and <head> show. */
const profileSchema = new Schema(
  {
    fullName: str,
    shortName: str,
    greeting: str,
    headline: str,
    subHeadline: str,
    heroDescription: str,
    photo: str,
    resumeUrl: str,
    aboutParagraphs: { type: [String], default: [] },
    traits: { type: [String], default: [] },
    stats: {
      type: [new Schema({ value: String, label: String, icon: String }, { _id: false })],
      default: [],
    },
    techBadges: { type: [String], default: [] },
    loaderTagline: str,
    footerTagline: str,
    availability: str,
    contact: {
      type: new Schema({ email: str, phone: str, location: str, heading: str, blurb: str }, { _id: false }),
      default: () => ({}),
    },
    socials: {
      type: [new Schema({ platform: { type: String, enum: SOCIAL_PLATFORMS }, label: String, url: String }, { _id: false })],
      default: [],
    },
    seo: {
      type: new Schema({ title: str, description: str }, { _id: false }),
      default: () => ({}),
    },
  },
  baseSchemaOptions(),
);

profileSchema.plugin(siteScopePlugin);
profileSchema.index({ siteId: 1 }, { unique: true });

/** Fields holding files this service may own; replaced or cleared values get their file deleted. */
export const PROFILE_FILE_FIELDS = ["photo", "resumeUrl"] as const;

export type Profile = InferSchemaType<typeof profileSchema>;
export const ProfileModel = model("Profile", profileSchema);

import { z } from "zod";
import { requiredText, tagList, text, urlOrPath } from "@/lib/schema";
import { SOCIAL_PLATFORMS } from "@/modules/profile/profile.model";

const email = z.union([z.literal(""), z.email("Enter a valid email")]);

/**
 * Every profile field. `PUT /profile` takes any subset (the dashboard saves one tab at a time),
 * so all fields are optional; nested objects (contact, seo) are replaced whole.
 */
export const updateProfileSchema = z
  .object({
    fullName: text(150),
    shortName: text(60),
    greeting: text(150),
    headline: text(150),
    subHeadline: text(150),
    heroDescription: text(1000),
    photo: urlOrPath,
    resumeUrl: urlOrPath,
    aboutParagraphs: z.array(requiredText(3000)).max(10),
    traits: tagList,
    stats: z
      .array(z.object({ value: requiredText(20), label: requiredText(60), icon: requiredText(50) }).strict())
      .max(12),
    techBadges: tagList,
    loaderTagline: text(100),
    footerTagline: text(300),
    availability: text(150),
    contact: z
      .object({
        email,
        phone: text(50),
        location: text(150),
        heading: text(150),
        blurb: text(1000),
      })
      .strict(),
    socials: z
      .array(
        z
          .object({
            platform: z.enum(SOCIAL_PLATFORMS),
            label: requiredText(60),
            url: urlOrPath.refine(v => v !== "", "URL is required"),
          })
          .strict(),
      )
      .max(20),
    seo: z.object({ title: text(120), description: text(320) }).strict(),
  })
  .partial()
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

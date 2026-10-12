import crypto from "node:crypto";
import type { Types } from "mongoose";
import { AppError } from "@/lib/AppError";
import { scheduleRevalidate } from "@/lib/revalidate";
import type { AnyModel } from "@/lib/crud";
import { removeSiteUploads } from "@/lib/storage";
import { EducationModel } from "@/modules/education/education.model";
import { ExperienceModel } from "@/modules/experience/experience.model";
import { MessageModel } from "@/modules/messages/message.model";
import { ProfileModel } from "@/modules/profile/profile.model";
import { ProjectModel } from "@/modules/projects/project.model";
import { PublicationModel } from "@/modules/publications/publication.model";
import { clearSiteCache } from "@/modules/sites/site.cache";
import { SiteModel, type SiteDoc } from "@/modules/sites/site.model";
import type { CreateSiteInput, UpdateSiteInput } from "@/modules/sites/site.schema";
import { SkillCategoryModel } from "@/modules/skills/skillCategory.model";

export const RESOURCE_KEYS = ["skill-categories", "experiences", "projects", "education", "publications"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

/** Resource name (as used in URLs) → model. */
export const RESOURCE_MODELS: Record<ResourceKey, AnyModel> = {
  "skill-categories": SkillCategoryModel,
  experiences: ExperienceModel,
  projects: ProjectModel,
  education: EducationModel,
  publications: PublicationModel,
};

const newSecret = () => crypto.randomBytes(32).toString("hex");

type Counts = Record<ResourceKey, number>;

const emptyCounts = (): Counts => Object.fromEntries(RESOURCE_KEYS.map(k => [k, 0])) as Counts;

/** Counts for many sites at once: one grouped aggregate per collection instead of one query per site. */
async function countsBySite(siteIds: Types.ObjectId[]) {
  const counts = new Map<string, Counts>(siteIds.map(id => [String(id), emptyCounts()]));
  const unread = new Map<string, number>();

  await Promise.all([
    ...RESOURCE_KEYS.map(async key => {
      const rows = await RESOURCE_MODELS[key].aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { siteId: { $in: siteIds } } },
        { $group: { _id: "$siteId", n: { $sum: 1 } } },
      ]);
      for (const row of rows) counts.get(String(row._id))![key] = row.n;
    }),
    (async () => {
      const rows = await MessageModel.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { siteId: { $in: siteIds }, read: false } },
        { $group: { _id: "$siteId", n: { $sum: 1 } } },
      ]);
      for (const row of rows) unread.set(String(row._id), row.n);
    })(),
  ]);

  return { counts, unread };
}

export async function listSitesWithCounts() {
  const sites = await SiteModel.find().sort({ createdAt: 1 });
  const { counts, unread } = await countsBySite(sites.map(s => s._id));
  return sites.map(site => ({
    ...site.toJSON(),
    counts: counts.get(String(site._id)) ?? emptyCounts(),
    unreadMessages: unread.get(String(site._id)) ?? 0,
  }));
}

export async function getSiteStats(siteId: Types.ObjectId) {
  const { counts, unread } = await countsBySite([siteId]);
  return { counts: counts.get(String(siteId))!, unreadMessages: unread.get(String(siteId)) ?? 0 };
}

/** Creates the site and its empty profile. The secret is returned here and on rotation only. */
export async function createSite(input: CreateSiteInput) {
  const revalidateSecret = newSecret();
  const site = await SiteModel.create({ ...input, revalidateSecret });
  try {
    await ProfileModel.create({ siteId: site._id });
  } catch (err) {
    await SiteModel.deleteOne({ _id: site._id });
    throw err;
  }
  return { site, revalidateSecret };
}

export async function updateSite(site: SiteDoc, input: UpdateSiteInput) {
  const previousSlug = site.slug;
  site.set(input);
  await site.save();
  clearSiteCache(previousSlug);
  clearSiteCache(site.slug);
  // Sections, active state and name all change what the website renders.
  scheduleRevalidate(site);
  return site;
}

export async function rotateSecret(site: SiteDoc) {
  const revalidateSecret = newSecret();
  await SiteModel.updateOne({ _id: site._id }, { $set: { revalidateSecret } });
  return { revalidateSecret };
}

/** Deletes the site with all its content, messages and uploaded files. */
export async function deleteSiteCascade(site: SiteDoc, confirmSlug: string) {
  if (confirmSlug !== site.slug) {
    throw AppError.validation([{ path: ["confirm"], message: "Type the site's slug to confirm" }], "Confirmation doesn't match the slug");
  }
  const siteId = site._id;
  await Promise.all([
    ...RESOURCE_KEYS.map(k => RESOURCE_MODELS[k].deleteMany({ siteId })),
    ProfileModel.deleteMany({ siteId }),
    MessageModel.deleteMany({ siteId }),
  ]);
  await SiteModel.deleteOne({ _id: siteId });
  await removeSiteUploads(String(siteId));
  clearSiteCache(site.slug);
}

/**
 * Creates the "shovon" site and imports the portfolio's current hardcoded content.
 *
 *   npm run seed            # does nothing if the site already exists
 *   npm run seed -- --force # re-imports that site's content (keeps its messages and secret)
 */
import type { z } from "zod";
import { env } from "@/config/env";
import { connectDb, disconnectDb } from "@/db/connect";
import { slugify } from "@/lib/slugify";
import { EducationModel } from "@/modules/education/education.model";
import { createEducationSchema } from "@/modules/education/education.schema";
import { ExperienceModel } from "@/modules/experience/experience.model";
import { createExperienceSchema } from "@/modules/experience/experience.schema";
import { ProfileModel } from "@/modules/profile/profile.model";
import { updateProfileSchema } from "@/modules/profile/profile.schema";
import { ProjectModel } from "@/modules/projects/project.model";
import { createProjectSchema } from "@/modules/projects/project.schema";
import { PublicationModel } from "@/modules/publications/publication.model";
import { createPublicationSchema } from "@/modules/publications/publication.schema";
import { SiteModel } from "@/modules/sites/site.model";
import { createSite, RESOURCE_MODELS } from "@/modules/sites/site.service";
import { SkillCategoryModel } from "@/modules/skills/skillCategory.model";
import { createSkillCategorySchema } from "@/modules/skills/skillCategory.schema";
import {
  seedEducation,
  seedExperiences,
  seedProfile,
  seedProjects,
  seedPublications,
  seedSite,
  seedSkillCategories,
} from "@/scripts/seed-data";
import type { AnyModel } from "@/lib/crud";
import type { Types } from "mongoose";

const force = process.argv.includes("--force");

/** Runs seed data through the API's own validation, then inserts it in order. */
async function importList<S extends z.ZodType>(model: AnyModel, schema: S, items: unknown[], siteId: Types.ObjectId, extra?: (item: z.output<S>) => object) {
  const docs = items.map((raw, order) => {
    const item = schema.parse(raw);
    return { ...(item as object), ...(extra?.(item) ?? {}), siteId, order, published: true };
  });
  await model.insertMany(docs);
  return docs.length;
}

async function main() {
  await connectDb(env.MONGODB_URI);

  let site = await SiteModel.findOne({ slug: seedSite.slug });
  if (site && !force) {
    console.log(`Site "${seedSite.slug}" already exists. Run with --force to re-import its content.`);
    return;
  }

  if (!site) {
    const created = await createSite(seedSite);
    site = created.site;
    console.log(`Created site "${seedSite.slug}".`);
    console.log(`\nAdd this to the portfolio's .env:\n  SITE_SLUG=${seedSite.slug}\n  REVALIDATE_SECRET=${created.revalidateSecret}\n`);
  } else {
    console.log(`Re-importing content for "${seedSite.slug}" (messages and secret are kept).`);
  }

  const siteId = site!._id;
  await Promise.all(Object.values(RESOURCE_MODELS).map(m => m.deleteMany({ siteId })));

  await ProfileModel.findOneAndUpdate({ siteId }, { $set: updateProfileSchema.parse(seedProfile) }, { upsert: true, setDefaultsOnInsert: true });

  const counts = {
    skillCategories: await importList(SkillCategoryModel, createSkillCategorySchema, seedSkillCategories, siteId),
    experiences: await importList(ExperienceModel, createExperienceSchema, seedExperiences, siteId),
    projects: await importList(ProjectModel, createProjectSchema, seedProjects, siteId, p => ({ slug: slugify(p.title) })),
    education: await importList(EducationModel, createEducationSchema, seedEducation, siteId),
    publications: await importList(PublicationModel, createPublicationSchema, seedPublications, siteId),
  };
  console.log("Imported profile and", counts);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());

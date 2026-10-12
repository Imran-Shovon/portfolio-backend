import type { SiteDoc } from "@/modules/sites/site.model";
import { ProfileModel } from "@/modules/profile/profile.model";
import { RESOURCE_MODELS, type ResourceKey } from "@/modules/sites/site.service";

/** Strips admin-only fields from list items. */
function publicItem(doc: { toJSON(): Record<string, unknown> }) {
  const { published: _p, order: _o, createdAt: _c, updatedAt: _u, ...rest } = doc.toJSON();
  return rest;
}

/**
 * Everything a website renders, in one payload. Only published items, sorted by `order`.
 * Disabled sections come back as empty arrays so consumers never need a null check.
 */
export async function getPublicContent(site: SiteDoc) {
  const siteId = site._id;
  const sections = site.sections;

  const list = async (key: ResourceKey, on: boolean) => {
    if (!on) return [];
    const docs = await RESOURCE_MODELS[key].find({ siteId, published: true }).sort({ order: 1, createdAt: 1 });
    return docs.map(publicItem);
  };

  const [profile, skillCategories, experiences, projects, education, publications] = await Promise.all([
    ProfileModel.findOne({ siteId }),
    list("skill-categories", sections.skills),
    list("experiences", sections.experience),
    list("projects", sections.projects),
    list("education", sections.education),
    list("publications", sections.publications),
  ]);

  let profileJson: Record<string, unknown> | null = null;
  if (profile) {
    const { createdAt: _c, updatedAt: _u, id: _id, ...rest } = profile.toJSON() as Record<string, unknown>;
    profileJson = rest;
  }

  return {
    site: { name: site.name, slug: site.slug, sections },
    profile: profileJson,
    skillCategories,
    experiences,
    projects,
    education,
    publications,
  };
}

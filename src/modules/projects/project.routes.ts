import { createCrudRouter } from "@/lib/crud";
import { slugify } from "@/lib/slugify";
import { ProjectModel } from "@/modules/projects/project.model";
import { createProjectSchema } from "@/modules/projects/project.schema";

/** A slug unique within the site, derived from the title: "e-kyc", "e-kyc-2", … */
async function uniqueSlug(title: string, siteId: string, excludeId?: string) {
  const base = slugify(title) || "project";
  let candidate = base;
  for (let n = 2; ; n++) {
    const clash = await ProjectModel.exists({ siteId, slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!clash) return candidate;
    candidate = `${base}-${n}`;
  }
}

export const projectsRouter = createCrudRouter({
  name: "Project",
  model: ProjectModel,
  createSchema: createProjectSchema,
  fileFields: ["image"],
  derive: async (input, { siteId, id }) =>
    typeof input.title === "string" ? { slug: await uniqueSlug(input.title, siteId, id) } : {},
});

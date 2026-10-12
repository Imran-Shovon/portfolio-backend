import { Router } from "express";
import { loadSiteById } from "@/middleware/site";
import { validate } from "@/middleware/validate";
import { educationRouter } from "@/modules/education/education.routes";
import { experienceRouter } from "@/modules/experience/experience.routes";
import { messagesAdminRouter } from "@/modules/messages/message.routes";
import { profileRouter } from "@/modules/profile/profile.routes";
import { projectsRouter } from "@/modules/projects/project.routes";
import { publicationsRouter } from "@/modules/publications/publication.routes";
import * as sites from "@/modules/sites/site.controller";
import { createSiteSchema, deleteSiteQuery, updateSiteSchema } from "@/modules/sites/site.schema";
import { skillCategoriesRouter } from "@/modules/skills/skillCategory.routes";
import { uploadsRouter } from "@/modules/uploads/upload.routes";

/** `/admin/sites` — mount behind `requireAdmin`. Everything under `/:siteId` is scoped to that site. */
export function createAdminSitesRouter() {
  const router = Router();
  router.get("/", sites.list);
  router.post("/", validate({ body: createSiteSchema }), sites.create);

  const site = Router({ mergeParams: true });
  site.use(loadSiteById);
  site.get("/", sites.get);
  site.patch("/", validate({ body: updateSiteSchema }), sites.update);
  site.delete("/", validate({ query: deleteSiteQuery }), sites.remove);
  site.post("/rotate-secret", sites.rotateSecret);
  site.post("/revalidate", sites.revalidate);
  site.get("/stats", sites.stats);

  site.use("/profile", profileRouter);
  site.use("/messages", messagesAdminRouter);
  site.use("/uploads", uploadsRouter);
  site.use("/skill-categories", skillCategoriesRouter);
  site.use("/experiences", experienceRouter);
  site.use("/projects", projectsRouter);
  site.use("/education", educationRouter);
  site.use("/publications", publicationsRouter);

  router.use("/:siteId", site);
  return router;
}

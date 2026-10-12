import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "@/lib/AppError";
import { objectId } from "@/lib/schema";
import { SiteModel, type SiteDoc } from "@/modules/sites/site.model";

const siteIdParams = z.object({ siteId: objectId });
const slugParams = z.object({ slug: z.string().regex(/^[a-z0-9-]{2,40}$/) });

/** Admin routes: `/admin/sites/:siteId/...` → req.site (inactive sites included). */
export const loadSiteById: RequestHandler = async (req, _res, next) => {
  const { siteId } = siteIdParams.parse(req.params);
  const site = await SiteModel.findById(siteId);
  if (!site) throw AppError.notFound("Site");
  req.site = site;
  next();
};

/** Public routes: `/public/sites/:slug` → req.site. Missing and inactive sites are both 404. */
export const loadSiteBySlug: RequestHandler = async (req, _res, next) => {
  const parsed = slugParams.safeParse(req.params);
  const site = parsed.success ? await SiteModel.findOne({ slug: parsed.data.slug, active: true }) : null;
  if (!site) throw AppError.notFound("Site");
  req.site = site;
  next();
};

/** For handlers mounted behind a site middleware. */
export function getSite(req: Request): SiteDoc {
  if (!req.site) throw new Error("getSite() used on a route without a site middleware");
  return req.site;
}

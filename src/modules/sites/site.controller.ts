import type { RequestHandler } from "express";
import { revalidateNow } from "@/lib/revalidate";
import { getSite } from "@/middleware/site";
import * as siteService from "@/modules/sites/site.service";

export const list: RequestHandler = async (_req, res) => {
  res.json({ data: await siteService.listSitesWithCounts() });
};

export const create: RequestHandler = async (req, res) => {
  const { site, revalidateSecret } = await siteService.createSite(req.body);
  res.status(201).json({ data: { ...site.toJSON(), revalidateSecret } });
};

export const get: RequestHandler = (req, res) => {
  res.json({ data: getSite(req) });
};

export const update: RequestHandler = async (req, res) => {
  res.json({ data: await siteService.updateSite(getSite(req), req.body) });
};

export const remove: RequestHandler = async (req, res) => {
  await siteService.deleteSiteCascade(getSite(req), (req.query as { confirm: string }).confirm);
  res.status(204).end();
};

export const rotateSecret: RequestHandler = async (req, res) => {
  res.json({ data: await siteService.rotateSecret(getSite(req)) });
};

export const revalidate: RequestHandler = async (req, res) => {
  res.json({ data: await revalidateNow(String(getSite(req)._id)) });
};

export const stats: RequestHandler = async (req, res) => {
  res.json({ data: await siteService.getSiteStats(getSite(req)._id) });
};

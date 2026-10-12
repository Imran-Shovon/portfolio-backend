import type { RequestHandler } from "express";
import { scheduleRevalidate } from "@/lib/revalidate";
import { getSite } from "@/middleware/site";
import * as profileService from "@/modules/profile/profile.service";

export const get: RequestHandler = async (req, res) => {
  res.json({ data: await profileService.getProfile(getSite(req)._id) });
};

export const update: RequestHandler = async (req, res) => {
  const site = getSite(req);
  const profile = await profileService.updateProfile(site._id, req.body);
  scheduleRevalidate(site);
  res.json({ data: profile });
};

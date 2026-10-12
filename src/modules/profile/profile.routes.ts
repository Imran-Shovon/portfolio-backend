import { Router } from "express";
import { validate } from "@/middleware/validate";
import * as profile from "@/modules/profile/profile.controller";
import { updateProfileSchema } from "@/modules/profile/profile.schema";

export const profileRouter = Router({ mergeParams: true });
profileRouter.get("/", profile.get);
profileRouter.put("/", validate({ body: updateProfileSchema }), profile.update);

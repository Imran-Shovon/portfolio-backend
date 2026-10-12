import { Router, type RequestHandler } from "express";
import { requireAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import * as auth from "@/modules/auth/auth.controller";
import { changePasswordSchema, loginSchema } from "@/modules/auth/auth.schema";

export function createAuthRouter(loginLimiter: RequestHandler) {
  const router = Router();
  router.post("/login", loginLimiter, validate({ body: loginSchema }), auth.login);
  router.post("/logout", auth.logout);
  router.get("/me", requireAdmin, auth.me);
  router.patch("/password", requireAdmin, validate({ body: changePasswordSchema }), auth.changePassword);
  return router;
}

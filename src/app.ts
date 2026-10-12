import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { UPLOAD_ROOT } from "@/lib/storage";
import { requireAdmin } from "@/middleware/auth";
import { errorHandler, notFound } from "@/middleware/error";
import { createRateLimiters } from "@/middleware/rateLimit";
import { createAuthRouter } from "@/modules/auth/auth.routes";
import { createPublicRouter } from "@/modules/public/public.routes";
import { createAdminSitesRouter } from "@/modules/sites/site.routes";

/** Builds the Express app without listening, so tests can drive it with supertest. */
export function createApp() {
  const app = express();
  const limiters = createRateLimiters();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  // Images and PDFs are embedded by the websites and the dashboard, which live on other origins.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: req => req.url === "/health" } }));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(
    "/uploads",
    express.static(UPLOAD_ROOT, { index: false, dotfiles: "deny", maxAge: "30d", immutable: true, fallthrough: false }),
  );

  const adminCors = cors({ origin: env.ADMIN_ORIGIN, credentials: true });
  app.use("/api/v1/auth", adminCors, createAuthRouter(limiters.login));
  app.use("/api/v1/admin/sites", adminCors, requireAdmin, createAdminSitesRouter());
  app.use("/api/v1/public", createPublicRouter(limiters.contact));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

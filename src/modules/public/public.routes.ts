import cors, { type CorsOptions } from "cors";
import { Router, type Request, type RequestHandler } from "express";
import { AppError } from "@/lib/AppError";
import { getSite, loadSiteBySlug } from "@/middleware/site";
import { validate } from "@/middleware/validate";
import { createMessageSchema } from "@/modules/messages/message.schema";
import * as messageService from "@/modules/messages/message.service";
import { getPublicContent } from "@/modules/public/public.service";
import { getAllowedOrigins } from "@/modules/sites/site.cache";

/** Read-only content can be fetched from anywhere (usually server-side). */
const openCors = cors({ origin: "*", methods: ["GET"] });

/** The contact form only accepts browsers on the site's own allowed origins. */
const contactCors = cors(async (req: Request, callback: (err: Error | null, options?: CorsOptions) => void) => {
  try {
    const origins = await getAllowedOrigins(String(req.params.slug ?? ""));
    const origin = req.header("Origin");
    callback(null, { origin: origin !== undefined && origins.includes(origin) ? origin : false, methods: ["POST"] });
  } catch (err) {
    callback(err as Error);
  }
});

/** CORS only stops browsers from reading the response; this stops the write itself. */
const requireAllowedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.header("Origin");
  if (!origin || !getSite(req).allowedOrigins.includes(origin)) {
    throw new AppError(403, "ORIGIN_NOT_ALLOWED", "This website isn't allowed to send messages");
  }
  next();
};

export function createPublicRouter(contactLimiter: RequestHandler) {
  const router = Router();

  router.get("/sites/:slug", openCors, loadSiteBySlug, async (req, res) => {
    // Never cache at a CDN: websites cache this themselves and are told exactly when to refresh
    // (revalidation webhook). A CDN copy (e.g. Vercel's edge) would hand them stale content.
    res.set("Cache-Control", "no-store");
    res.json({ data: await getPublicContent(getSite(req)) });
  });

  router.options("/sites/:slug/messages", contactCors);
  router.post(
    "/sites/:slug/messages",
    contactCors,
    loadSiteBySlug,
    requireAllowedOrigin,
    contactLimiter,
    validate({ body: createMessageSchema }),
    async (req, res) => {
      // Honeypot filled → pretend it worked so bots learn nothing, but store nothing.
      if (!req.body.website) {
        await messageService.createMessage(getSite(req)._id, req.body, { ip: req.ip, userAgent: req.header("User-Agent") });
      }
      res.status(201).json({ data: { ok: true } });
    },
  );

  return router;
}

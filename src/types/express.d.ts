import type { AdminDoc } from "@/modules/auth/admin.model";
import type { SiteDoc } from "@/modules/sites/site.model";

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAdmin`. */
      admin?: AdminDoc;
      /** Set by `loadSiteById` / `loadSiteBySlug`. */
      site?: SiteDoc;
    }
  }
}

export {};

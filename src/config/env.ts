import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "Use a number followed by s, m, h or d, e.g. 7d")
    .default("7d"),
  COOKIE_DOMAIN: z.string().default(""),
  ADMIN_ORIGIN: z.url().default("http://localhost:3001"),
  // On Render, RENDER_EXTERNAL_URL (https://<service>.onrender.com) is set automatically.
  PUBLIC_BASE_URL: z
    .url()
    .default(
      process.env.RENDER_EXTERNAL_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:4000"),
    ),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  /** "local": files on disk under UPLOAD_DIR (dev). "vercel-blob" / "cloudinary": files survive redeploys (production). */
  STORAGE_DRIVER: z.enum(["local", "vercel-blob", "cloudinary"]).default("local"),
  /** Set automatically when a Vercel Blob store is connected to the project. */
  BLOB_READ_WRITE_TOKEN: z.string().default(""),
  /** cloudinary://<api_key>:<api_secret>@<cloud_name>, from the Cloudinary dashboard. */
  CLOUDINARY_URL: z
    .string()
    .default("")
    .refine(v => v === "" || /^cloudinary:\/\/[^:]+:[^@]+@[\w-]+$/.test(v), "Must look like cloudinary://<api_key>:<api_secret>@<cloud_name>"),
  /** Top-level folder for uploads in Vercel Blob / Cloudinary. */
  STORAGE_FOLDER: z.string().regex(/^[\w-]+$/).default("portfolio"),
  /** Public URL of the first website, used by `npm run seed` for siteUrl / allowed origin / revalidate URL. */
  SEED_SITE_URL: z.url().default("http://localhost:3000"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  ADMIN_EMAIL: z.string().default(""),
  ADMIN_PASSWORD: z.string().default(""),
});

const parsed = envSchema
  // Hosting dashboards often store unset variables as "", which should mean "use the default".
  .refine(v => v.STORAGE_DRIVER !== "cloudinary" || v.CLOUDINARY_URL !== "", {
    path: ["CLOUDINARY_URL"],
    message: "Required when STORAGE_DRIVER=cloudinary",
  })
  .refine(v => v.STORAGE_DRIVER !== "vercel-blob" || v.BLOB_READ_WRITE_TOKEN !== "", {
    path: ["BLOB_READ_WRITE_TOKEN"],
    message: "Required when STORAGE_DRIVER=vercel-blob (connect a Blob store to the Vercel project)",
  })
  .safeParse(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== "")));

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PUBLIC_BASE_URL: parsed.data.PUBLIC_BASE_URL.replace(/\/$/, ""),
  isProduction: parsed.data.NODE_ENV === "production",
};

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
  PUBLIC_BASE_URL: z.url().default("http://localhost:4000"),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  ADMIN_EMAIL: z.string().default(""),
  ADMIN_PASSWORD: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

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

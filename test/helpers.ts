import { rm } from "node:fs/promises";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { createApp } from "@/app";
import { UPLOAD_ROOT } from "@/lib/storage";
import { upsertAdmin } from "@/modules/auth/auth.service";
import { clearSiteCache } from "@/modules/sites/site.cache";

export const ADMIN = { email: "admin@example.com", password: "correct-horse-battery" };

/** In-memory MongoDB per test file, wiped before each test. */
export function useTestDb() {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    // Unique indexes must exist before tests rely on duplicate-key errors.
    await Promise.all(Object.values(mongoose.models).map(m => m.syncIndexes()));
  });

  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map(c => c.deleteMany({})));
    await rm(UPLOAD_ROOT, { recursive: true, force: true });
    clearSiteCache();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
    await rm(UPLOAD_ROOT, { recursive: true, force: true });
  });
}

/** A fresh app (fresh rate-limit counters) and a logged-in agent that keeps the auth cookie. */
export async function loggedInAgent() {
  const app = createApp();
  await upsertAdmin(ADMIN.email, ADMIN.password, "Test Admin");
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send(ADMIN).expect(200);
  return { app, agent };
}

export const siteInput = (slug: string, extra: Record<string, unknown> = {}) => ({
  name: `Site ${slug}`,
  slug,
  siteUrl: `https://${slug}.example.com`,
  allowedOrigins: [`https://${slug}.example.com`],
  revalidateUrl: "",
  ...extra,
});

export const projectInput = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  type: "Personal",
  duration: "2025",
  image: "",
  summary: "Summary",
  description: "Description",
  tech: ["React"],
  accent: "#3b82f6",
  liveUrl: "",
  githubUrl: "",
  ...extra,
});

/** Smallest valid PNG header; enough for the type sniffing. */
export const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

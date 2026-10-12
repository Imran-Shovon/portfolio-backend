/**
 * Creates the admin, or resets its password, from ADMIN_EMAIL / ADMIN_PASSWORD (and optional ADMIN_NAME).
 *
 *   npm run create-admin
 */
import { z } from "zod";
import { env } from "@/config/env";
import { connectDb, disconnectDb } from "@/db/connect";
import { upsertAdmin } from "@/modules/auth/auth.service";

const input = z
  .object({
    email: z.email("ADMIN_EMAIL must be a valid email"),
    password: z.string().min(10, "ADMIN_PASSWORD must be at least 10 characters"),
  })
  .safeParse({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });

if (!input.success) {
  for (const issue of input.error.issues) console.error(issue.message);
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, then run again.");
  process.exit(1);
}

try {
  await connectDb(env.MONGODB_URI);
  const { admin, created } = await upsertAdmin(input.data.email, input.data.password, process.env.ADMIN_NAME ?? "");
  console.log(`${created ? "Created" : "Reset password for"} admin ${admin.email}.`);
  console.log("Tip: remove ADMIN_PASSWORD from .env now that it's stored (hashed) in the database.");
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}

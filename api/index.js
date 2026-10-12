// Vercel serverless entry. `npm run build` compiles src/ to dist/ first; every request is
// rewritten here by vercel.json. The MongoDB connection is reused across warm invocations.
import { createApp } from "../dist/app.js";
import { env } from "../dist/config/env.js";
import { connectDb } from "../dist/db/connect.js";
import { logger } from "../dist/lib/logger.js";

const app = createApp();
let ready;

export default async function handler(req, res) {
  try {
    ready ??= connectDb(env.MONGODB_URI);
    await ready;
  } catch (err) {
    ready = undefined; // retry the connection on the next request
    logger.error({ err }, "MongoDB connection failed");
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "DB_UNAVAILABLE", message: "Database unavailable, try again shortly" } }));
    return;
  }
  return app(req, res);
}

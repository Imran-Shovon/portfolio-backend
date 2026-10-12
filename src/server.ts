import { createApp } from "@/app";
import { env } from "@/config/env";
import { connectDb, disconnectDb } from "@/db/connect";
import { logger } from "@/lib/logger";

await connectDb(env.MONGODB_URI);

const server = createApp().listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

import mongoose from "mongoose";
import { logger } from "@/lib/logger";

mongoose.set("strictQuery", true);

export async function connectDb(uri: string) {
  // Fail fast with a clear error instead of hanging when MongoDB isn't running.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

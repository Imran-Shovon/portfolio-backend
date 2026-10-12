import pino from "pino";
import { env } from "@/config/env";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.isProduction ? "info" : "debug",
  redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } } : undefined,
});

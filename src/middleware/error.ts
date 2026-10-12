import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { env } from "@/config/env";
import { AppError } from "@/lib/AppError";
import { logger } from "@/lib/logger";

export const notFound: RequestHandler = req => {
  throw new AppError(404, "NOT_FOUND", `No route for ${req.method} ${req.path}`);
};

interface MongoDuplicateKeyError {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKey(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}

function toAppError(err: unknown): AppError | null {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return AppError.validation(err.issues.map(i => ({ path: i.path.map(p => (typeof p === "symbol" ? String(p) : p)), message: i.message })));
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return AppError.validation(Object.entries(err.errors).map(([path, e]) => ({ path: path.split("."), message: e.message })));
  }

  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid value for ${err.path}`);
  }

  if (isDuplicateKey(err)) {
    // Ignore the siteId part of compound keys so the dashboard can point at the real field.
    const fields = Object.keys(err.keyValue ?? {}).filter(f => f !== "siteId");
    return new AppError(
      409,
      "DUPLICATE",
      "That value is already in use",
      fields.map(f => ({ path: [f], message: "This value is already in use" })),
    );
  }

  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return new AppError(413, "FILE_TOO_LARGE", "The file is too large");
    return AppError.badRequest(err.message);
  }

  // body-parser errors carry a `type` and an HTTP `status`.
  const bodyErr = err as { type?: string; status?: number };
  if (bodyErr?.type === "entity.parse.failed") return AppError.badRequest("Malformed JSON body");
  if (bodyErr?.type === "entity.too.large") return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");

  return null;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = toAppError(err);

  if (appError) {
    res.status(appError.status).json({
      error: { code: appError.code, message: appError.message, ...(appError.details ? { details: appError.details } : {}) },
    });
    return;
  }

  logger.error({ err, method: req.method, url: req.originalUrl }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
      ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : String(err) }),
    },
  });
};

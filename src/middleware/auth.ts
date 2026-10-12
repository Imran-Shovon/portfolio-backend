import type { CookieOptions, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { AppError } from "@/lib/AppError";
import { AdminModel } from "@/modules/auth/admin.model";

export const AUTH_COOKIE = "portfolio_admin";

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** "7d" → milliseconds (env validation guarantees the format). */
function durationMs(value: string) {
  const unit = value.slice(-1) as keyof typeof UNIT_MS;
  return Number(value.slice(0, -1)) * UNIT_MS[unit];
}

export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: durationMs(env.JWT_EXPIRES_IN),
  };
}

export function signAdminToken(adminId: string) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: adminId,
    algorithm: "HS256",
    expiresIn: Math.floor(durationMs(env.JWT_EXPIRES_IN) / 1000),
  });
}

const unauthorized = () => new AppError(401, "UNAUTHORIZED", "Please sign in");

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  if (typeof token !== "string" || !token) throw unauthorized();

  let adminId: string | undefined;
  try {
    adminId = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }).sub as string | undefined;
  } catch {
    throw unauthorized();
  }

  const admin = adminId ? await AdminModel.findById(adminId) : null;
  if (!admin) throw unauthorized();

  req.admin = admin;
  next();
};

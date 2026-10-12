import type { RequestHandler } from "express";
import { AUTH_COOKIE, authCookieOptions, signAdminToken } from "@/middleware/auth";
import * as authService from "@/modules/auth/auth.service";

export const login: RequestHandler = async (req, res) => {
  const admin = await authService.login(req.body.email, req.body.password);
  res.cookie(AUTH_COOKIE, signAdminToken(String(admin._id)), authCookieOptions());
  res.json({ data: admin });
};

export const logout: RequestHandler = (_req, res) => {
  const { maxAge: _maxAge, ...options } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE, options);
  res.status(204).end();
};

export const me: RequestHandler = (req, res) => {
  res.json({ data: req.admin });
};

export const changePassword: RequestHandler = async (req, res) => {
  await authService.changePassword(String(req.admin!._id), req.body.currentPassword, req.body.newPassword);
  res.status(204).end();
};

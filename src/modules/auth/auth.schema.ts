import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254),
    password: z.string().min(1).max(200),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required").max(200),
    newPassword: z.string().min(10, "Use at least 10 characters").max(200),
  })
  .strict();

import { z } from "zod";
import { requiredText, text } from "@/lib/schema";

/** Public contact form. `website` is a honeypot: humans never see or fill it. */
export const createMessageSchema = z
  .object({
    name: requiredText(100),
    email: z.email("Enter a valid email").max(254),
    subject: text(200).optional(),
    message: requiredText(5000),
    website: z.string().optional(),
  })
  .strict();

export const listMessagesQuery = z.object({
  status: z.enum(["unread", "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateMessageSchema = z.object({ read: z.boolean() }).strict();

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuery>;

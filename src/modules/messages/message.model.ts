import { model, Schema } from "mongoose";
import { baseSchemaOptions } from "@/lib/schema";
import { siteScopePlugin } from "@/lib/siteScope";

const messageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, default: "", trim: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    ip: { type: String, select: false },
    userAgent: { type: String, select: false },
  },
  baseSchemaOptions(),
);

messageSchema.plugin(siteScopePlugin);
messageSchema.index({ siteId: 1, createdAt: -1 });
messageSchema.index({ siteId: 1, read: 1 });

export const MessageModel = model("Message", messageSchema);

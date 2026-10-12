import type { Types } from "mongoose";
import { AppError } from "@/lib/AppError";
import { MessageModel } from "@/modules/messages/message.model";
import type { CreateMessageInput, ListMessagesQuery } from "@/modules/messages/message.schema";

export async function listMessages(siteId: Types.ObjectId, { status, page, limit }: ListMessagesQuery) {
  const filter = { siteId, ...(status === "unread" ? { read: false } : {}) };
  const [data, total] = await Promise.all([
    MessageModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    MessageModel.countDocuments(filter),
  ]);
  return { data, total };
}

export async function setRead(siteId: Types.ObjectId, id: string, read: boolean) {
  const message = await MessageModel.findOneAndUpdate({ _id: id, siteId }, { $set: { read } }, { new: true });
  if (!message) throw AppError.notFound("Message");
  return message;
}

export async function deleteMessage(siteId: Types.ObjectId, id: string) {
  const deleted = await MessageModel.findOneAndDelete({ _id: id, siteId });
  if (!deleted) throw AppError.notFound("Message");
}

export async function createMessage(siteId: Types.ObjectId, input: CreateMessageInput, meta: { ip?: string; userAgent?: string }) {
  const { website: _honeypot, ...fields } = input;
  return MessageModel.create({ ...fields, subject: fields.subject ?? "", siteId, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) });
}

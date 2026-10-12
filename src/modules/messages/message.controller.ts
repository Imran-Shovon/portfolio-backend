import type { RequestHandler } from "express";
import { getSite } from "@/middleware/site";
import type { ListMessagesQuery } from "@/modules/messages/message.schema";
import * as messageService from "@/modules/messages/message.service";

export const list: RequestHandler = async (req, res) => {
  const { data, total } = await messageService.listMessages(getSite(req)._id, req.query as unknown as ListMessagesQuery);
  res.json({ data, meta: { total } });
};

export const update: RequestHandler = async (req, res) => {
  res.json({ data: await messageService.setRead(getSite(req)._id, req.params.id as string, req.body.read) });
};

export const remove: RequestHandler = async (req, res) => {
  await messageService.deleteMessage(getSite(req)._id, req.params.id as string);
  res.status(204).end();
};

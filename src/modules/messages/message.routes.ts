import { Router } from "express";
import { idParams } from "@/lib/schema";
import { validate } from "@/middleware/validate";
import * as messages from "@/modules/messages/message.controller";
import { listMessagesQuery, updateMessageSchema } from "@/modules/messages/message.schema";

/** `/admin/sites/:siteId/messages`. The public submit route lives in the public module. */
export const messagesAdminRouter = Router({ mergeParams: true });
messagesAdminRouter.get("/", validate({ query: listMessagesQuery }), messages.list);
messagesAdminRouter.patch("/:id", validate({ params: idParams.passthrough(), body: updateMessageSchema }), messages.update);
messagesAdminRouter.delete("/:id", validate({ params: idParams.passthrough() }), messages.remove);

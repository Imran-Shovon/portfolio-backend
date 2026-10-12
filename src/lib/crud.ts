import { Router, type Request } from "express";
import type { Model } from "mongoose";
import { z, type ZodObject, type ZodRawShape } from "zod";
import { AppError } from "@/lib/AppError";
import { scheduleRevalidate } from "@/lib/revalidate";
import { idParams, objectId } from "@/lib/schema";
import { removeReplacedUploads, removeUpload } from "@/lib/storage";
import { getSite } from "@/middleware/site";
import { validate } from "@/middleware/validate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared router for five different models
export type AnyModel = Model<any>;

interface CrudConfig {
  /** Singular display name for errors, e.g. "Project". */
  name: string;
  model: AnyModel;
  createSchema: ZodObject<ZodRawShape>;
  /** Fields that may hold an uploaded file; replaced/cleared/deleted values get their file removed. */
  fileFields?: readonly string[];
  /** Extra fields derived on the server (e.g. a project's slug). */
  derive?: (input: Record<string, unknown>, ctx: { siteId: string; id?: string }) => Promise<Record<string, unknown>>;
}

const reorderSchema = z.object({ ids: z.array(objectId).max(1000) }).strict();

/**
 * Identical list/create/get/update/delete/reorder routes for an ordered, site-scoped collection.
 * Mount behind `requireAdmin` + `loadSiteById` with `/admin/sites/:siteId/<resource>`.
 */
export function createCrudRouter({ name, model, createSchema, fileFields = [], derive }: CrudConfig) {
  const router = Router({ mergeParams: true });
  const createBody = createSchema.extend({ published: z.boolean().optional() }).strict();
  const updateBody = createBody.partial().strict();

  const siteOf = (req: Request) => {
    const site = getSite(req);
    return { site, siteId: String(site._id) };
  };

  router.get("/", async (req, res) => {
    const { siteId } = siteOf(req);
    const items = await model.find({ siteId }).sort({ order: 1, createdAt: 1 });
    res.json({ data: items });
  });

  router.post("/", validate({ body: createBody }), async (req, res) => {
    const { site, siteId } = siteOf(req);
    const last = await model.findOne({ siteId }).sort({ order: -1 }).select("order");
    const extra = derive ? await derive(req.body, { siteId }) : {};
    const item = await model.create({ ...req.body, ...extra, siteId, order: last ? last.order + 1 : 0 });
    scheduleRevalidate(site);
    res.status(201).json({ data: item });
  });

  // Must be registered before "/:id".
  router.patch("/reorder", validate({ body: reorderSchema }), async (req, res) => {
    const { site, siteId } = siteOf(req);
    const ids: string[] = req.body.ids;
    const unique = new Set(ids);
    const [total, matching] = await Promise.all([
      model.countDocuments({ siteId }),
      model.countDocuments({ siteId, _id: { $in: [...unique] } }),
    ]);
    if (unique.size !== ids.length || ids.length !== total || matching !== total) {
      throw AppError.badRequest("ids must list every item of this site exactly once");
    }
    await model.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id, siteId }, update: { $set: { order } } } })));
    scheduleRevalidate(site);
    res.status(204).end();
  });

  router.get("/:id", validate({ params: idParams.passthrough() }), async (req, res) => {
    const { siteId } = siteOf(req);
    const item = await model.findOne({ _id: req.params.id, siteId });
    if (!item) throw AppError.notFound(name);
    res.json({ data: item });
  });

  router.patch("/:id", validate({ params: idParams.passthrough(), body: updateBody }), async (req, res) => {
    const { site, siteId } = siteOf(req);
    const id = req.params.id as string;
    const before = await model.findOne({ _id: id, siteId }).lean<Record<string, unknown>>();
    if (!before) throw AppError.notFound(name);

    const extra = derive ? await derive(req.body, { siteId, id }) : {};
    const item = await model.findOneAndUpdate({ _id: id, siteId }, { $set: { ...req.body, ...extra } }, { new: true, runValidators: true });
    if (!item) throw AppError.notFound(name);

    await removeReplacedUploads(before, item.toObject(), fileFields);
    scheduleRevalidate(site);
    res.json({ data: item });
  });

  router.delete("/:id", validate({ params: idParams.passthrough() }), async (req, res) => {
    const { site, siteId } = siteOf(req);
    const item = await model.findOneAndDelete({ _id: req.params.id, siteId }).lean<Record<string, unknown>>();
    if (!item) throw AppError.notFound(name);
    await Promise.all(fileFields.map(f => removeUpload(item[f] as string | undefined)));
    scheduleRevalidate(site);
    res.status(204).end();
  });

  return router;
}

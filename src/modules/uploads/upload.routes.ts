import { Router } from "express";
import multer from "multer";
import { AppError } from "@/lib/AppError";
import { MAX_UPLOAD_BYTES, saveUpload } from "@/lib/storage";
import { getSite } from "@/middleware/site";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0 },
});

/** `POST /admin/sites/:siteId/uploads` with multipart field `file` → `{ url }`. */
export const uploadsRouter = Router({ mergeParams: true });

uploadsRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) throw AppError.badRequest('Send the file in a multipart field named "file"');
  const url = await saveUpload(String(getSite(req)._id), req.file);
  res.status(201).json({ data: { url } });
});

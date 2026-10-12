import { model } from "mongoose";
import { createListSchema } from "@/lib/listSchema";

const publicationSchema = createListSchema({
  title: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  image: { type: String, default: "" },
  description: { type: String, required: true },
  publisher: { type: String, required: true },
  publisherFull: { type: String, default: "" },
  accent: { type: String, required: true },
  tags: { type: [String], default: [] },
  paperUrl: { type: String, default: "" },
});

export const PublicationModel = model("Publication", publicationSchema);

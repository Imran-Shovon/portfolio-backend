import { model } from "mongoose";
import { createListSchema } from "@/lib/listSchema";

export const PROJECT_TYPES = ["Professional", "Personal"] as const;

const projectSchema = createListSchema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true },
  type: { type: String, enum: PROJECT_TYPES, required: true },
  duration: { type: String, required: true },
  image: { type: String, default: "" },
  summary: { type: String, required: true },
  description: { type: String, required: true },
  tech: { type: [String], default: [] },
  accent: { type: String, required: true },
  // "" hides the button on the website. Never "#".
  liveUrl: { type: String, default: "" },
  githubUrl: { type: String, default: "" },
});

projectSchema.index({ siteId: 1, slug: 1 }, { unique: true });

export const ProjectModel = model("Project", projectSchema);

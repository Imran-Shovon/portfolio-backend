import { model } from "mongoose";
import { createListSchema } from "@/lib/listSchema";

export const EXPERIENCE_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"] as const;

const experienceSchema = createListSchema({
  role: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  duration: { type: String, required: true },
  type: { type: String, enum: EXPERIENCE_TYPES, required: true },
  accent: { type: String, required: true },
  responsibilities: { type: [String], default: [] },
  tech: { type: [String], default: [] },
});

export const ExperienceModel = model("Experience", experienceSchema);

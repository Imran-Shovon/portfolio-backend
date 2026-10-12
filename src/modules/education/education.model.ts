import { model } from "mongoose";
import { createListSchema } from "@/lib/listSchema";

const educationSchema = createListSchema({
  degree: { type: String, required: true, trim: true },
  institution: { type: String, required: true, trim: true },
  duration: { type: String, default: "" },
  status: { type: String, default: "" },
  grade: { type: String, required: true },
  gradeLabel: { type: String, required: true },
  description: { type: String, required: true },
  accent: { type: String, required: true },
});

export const EducationModel = model("Education", educationSchema);

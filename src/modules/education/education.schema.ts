import { z } from "zod";
import { hexColor, requiredText, text } from "@/lib/schema";

export const createEducationSchema = z.object({
  degree: requiredText(200),
  institution: requiredText(200),
  duration: text(100).optional(),
  status: text(100).optional(),
  grade: requiredText(50),
  gradeLabel: requiredText(30),
  description: requiredText(2000),
  accent: hexColor,
});

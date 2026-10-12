import { z } from "zod";
import { hexColor, requiredText, tagList } from "@/lib/schema";
import { EXPERIENCE_TYPES } from "@/modules/experience/experience.model";

export const createExperienceSchema = z.object({
  role: requiredText(150),
  company: requiredText(150),
  duration: requiredText(100),
  type: z.enum(EXPERIENCE_TYPES),
  accent: hexColor,
  responsibilities: z.array(requiredText(500)).max(30),
  tech: tagList,
});

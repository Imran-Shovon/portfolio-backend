import { z } from "zod";
import { hexColor, requiredText } from "@/lib/schema";

export const createSkillCategorySchema = z.object({
  title: requiredText(100),
  icon: requiredText(50),
  color: hexColor,
  skills: z
    .array(
      z.object({
        name: requiredText(100),
        level: z.number().int().min(0).max(100),
      }).strict(),
    )
    .max(50),
});

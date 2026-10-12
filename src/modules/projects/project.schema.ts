import { z } from "zod";
import { hexColor, requiredText, tagList, urlOrPath } from "@/lib/schema";
import { PROJECT_TYPES } from "@/modules/projects/project.model";

export const createProjectSchema = z.object({
  title: requiredText(150),
  type: z.enum(PROJECT_TYPES),
  duration: requiredText(100),
  image: urlOrPath,
  summary: requiredText(200),
  description: requiredText(5000),
  tech: tagList,
  accent: hexColor,
  liveUrl: urlOrPath,
  githubUrl: urlOrPath,
});

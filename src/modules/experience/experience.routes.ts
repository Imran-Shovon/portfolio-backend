import { createCrudRouter } from "@/lib/crud";
import { ExperienceModel } from "@/modules/experience/experience.model";
import { createExperienceSchema } from "@/modules/experience/experience.schema";

export const experienceRouter = createCrudRouter({
  name: "Experience",
  model: ExperienceModel,
  createSchema: createExperienceSchema,
});

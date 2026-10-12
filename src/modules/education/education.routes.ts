import { createCrudRouter } from "@/lib/crud";
import { EducationModel } from "@/modules/education/education.model";
import { createEducationSchema } from "@/modules/education/education.schema";

export const educationRouter = createCrudRouter({
  name: "Education entry",
  model: EducationModel,
  createSchema: createEducationSchema,
});

import { createCrudRouter } from "@/lib/crud";
import { createSkillCategorySchema } from "@/modules/skills/skillCategory.schema";
import { SkillCategoryModel } from "@/modules/skills/skillCategory.model";

export const skillCategoriesRouter = createCrudRouter({
  name: "Skill category",
  model: SkillCategoryModel,
  createSchema: createSkillCategorySchema,
});

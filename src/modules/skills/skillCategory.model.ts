import { model, Schema } from "mongoose";
import { createListSchema } from "@/lib/listSchema";

const skillCategorySchema = createListSchema({
  title: { type: String, required: true, trim: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  skills: {
    type: [new Schema({ name: { type: String, required: true }, level: { type: Number, min: 0, max: 100, required: true } }, { _id: false })],
    default: [],
  },
});

export const SkillCategoryModel = model("SkillCategory", skillCategorySchema);

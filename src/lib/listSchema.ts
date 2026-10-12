import { Schema, type SchemaDefinition } from "mongoose";
import { baseSchemaOptions } from "@/lib/schema";
import { siteScopePlugin } from "@/lib/siteScope";

/**
 * Schema for an ordered, publishable, site-scoped list collection (skills, experience, projects,
 * education, publications). Adds `siteId`, `order`, `published` and timestamps.
 */
export function createListSchema<T extends SchemaDefinition>(definition: T) {
  const schema = new Schema(
    {
      ...definition,
      order: { type: Number, required: true, default: 0 },
      published: { type: Boolean, default: true },
    },
    baseSchemaOptions(),
  );
  schema.plugin(siteScopePlugin);
  schema.index({ siteId: 1, order: 1 });
  return schema;
}

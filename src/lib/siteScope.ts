import type { Schema } from "mongoose";
import { env } from "@/config/env";

const SCOPED_QUERIES = [
  "countDocuments",
  "deleteMany",
  "deleteOne",
  "find",
  "findOne",
  "findOneAndDelete",
  "findOneAndReplace",
  "findOneAndUpdate",
  "replaceOne",
  "updateMany",
  "updateOne",
] as const;

/**
 * Adds a required `siteId` and, outside production, makes any query on the model throw when its
 * filter has no `siteId`. Catches a forgotten site filter the first time it runs.
 *
 * No index here: every scoped schema declares its own compound index starting with `siteId`
 * (and Profile's must be unique), which also serves siteId-only queries.
 */
export function siteScopePlugin(schema: Schema) {
  schema.add({ siteId: { type: "ObjectId", ref: "Site", required: true, immutable: true } });

  if (env.isProduction) return;

  for (const op of SCOPED_QUERIES) {
    schema.pre(op, function () {
      const filter = this.getFilter();
      if (!filter || filter.siteId === undefined) {
        const model = (this as unknown as { model: { modelName: string } }).model.modelName;
        throw new Error(`siteScope: ${model}.${op}() without a siteId filter`);
      }
    });
  }

  schema.pre("aggregate", function () {
    const [first] = this.pipeline();
    const match = first && "$match" in first ? (first.$match as Record<string, unknown>) : undefined;
    if (!match || match.siteId === undefined) {
      throw new Error("siteScope: aggregate() must start with a $match on siteId");
    }
  });
}

import { model, Schema, type HydratedDocument } from "mongoose";
import { baseSchemaOptions } from "@/lib/schema";

export interface Admin {
  email: string;
  passwordHash: string;
  name: string;
  lastLoginAt?: Date;
}

const adminSchema = new Schema<Admin>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, default: "", trim: true },
    lastLoginAt: { type: Date },
  },
  baseSchemaOptions({ hide: ["passwordHash"] }),
);


export type AdminDoc = HydratedDocument<Admin>;
export const AdminModel = model<Admin>("Admin", adminSchema);

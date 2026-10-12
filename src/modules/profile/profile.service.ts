import type { Types } from "mongoose";
import { removeReplacedUploads } from "@/lib/storage";
import { PROFILE_FILE_FIELDS, ProfileModel } from "@/modules/profile/profile.model";
import type { UpdateProfileInput } from "@/modules/profile/profile.schema";

export function getProfile(siteId: Types.ObjectId) {
  return ProfileModel.findOne({ siteId });
}

export async function updateProfile(siteId: Types.ObjectId, input: UpdateProfileInput) {
  const before = await ProfileModel.findOne({ siteId }).lean<Record<string, unknown>>();
  const profile = await ProfileModel.findOneAndUpdate(
    { siteId },
    { $set: input },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await removeReplacedUploads(before, profile.toObject(), PROFILE_FILE_FIELDS);
  return profile;
}

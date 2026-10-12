import bcrypt from "bcryptjs";
import { AppError } from "@/lib/AppError";
import { AdminModel, type AdminDoc } from "@/modules/auth/admin.model";

const BCRYPT_ROUNDS = 12;

// Compared against when the email doesn't exist, so both failure paths take the same time.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS));

const invalidCredentials = () => new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

export async function login(email: string, password: string): Promise<AdminDoc> {
  const admin = await AdminModel.findOne({ email }).select("+passwordHash");
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? getDummyHash());
  if (!admin || !ok) throw invalidCredentials();

  admin.lastLoginAt = new Date();
  await admin.save();
  return admin;
}

export async function changePassword(adminId: string, currentPassword: string, newPassword: string) {
  const admin = await AdminModel.findById(adminId).select("+passwordHash");
  if (!admin) throw new AppError(401, "UNAUTHORIZED", "Please sign in");

  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    throw AppError.validation([{ path: ["currentPassword"], message: "Current password is incorrect" }]);
  }
  admin.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await admin.save();
}

/** Creates the admin, or resets the password (and name) of an existing one with that email. */
export async function upsertAdmin(email: string, password: string, name = "") {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const normalized = email.trim().toLowerCase();
  const existing = await AdminModel.findOne({ email: normalized });
  if (existing) {
    existing.passwordHash = passwordHash;
    if (name) existing.name = name;
    await existing.save();
    return { admin: existing, created: false };
  }
  const admin = await AdminModel.create({ email: normalized, passwordHash, name });
  return { admin, created: true };
}

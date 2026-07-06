// Run with: npm run seed:admin
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = "admin@example.com"; // change this
  const password = "ChangeMe123!"; // change this immediately after first login

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  await User.create({ name: "Admin", email, password, role: "admin" });
  console.log("Admin user created:");
  console.log("  email:", email);
  console.log("  password:", password);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

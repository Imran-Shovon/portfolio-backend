import os from "node:os";
import path from "node:path";

// Runs before each test file's imports, so src/config/env.ts sees these values.
process.env.NODE_ENV = "test";
process.env.MONGODB_URI ??= "mongodb://placeholder"; // replaced per file by the in-memory server
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.ADMIN_ORIGIN = "http://admin.test";
process.env.PUBLIC_BASE_URL = "http://api.test";
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `portfolio-backend-test-${process.pid}`);

const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv");

dotenv.config();

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "lms.db");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
const TEMP_UPLOADS_DIR = path.join(UPLOADS_DIR, "tmp");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");
const MATERIALS_DIR = path.join(UPLOADS_DIR, "materials");

[DATA_DIR, UPLOADS_DIR, TEMP_UPLOADS_DIR, VIDEOS_DIR, MATERIALS_DIR].forEach((directory) => {
  fs.mkdirSync(directory, { recursive: true });
});

const DATABASE_PROVIDER = (process.env.DATABASE_PROVIDER || (process.env.DATABASE_URL ? "postgres" : "sqlite")).toLowerCase();
const STORAGE_PROVIDER = (
  process.env.STORAGE_PROVIDER || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local")
).toLowerCase();

const DATABASE_URL = process.env.DATABASE_URL || "";
const DATABASE_SSL = process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false };

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_VIDEOS_BUCKET = process.env.SUPABASE_VIDEOS_BUCKET || "lesson-videos";
const SUPABASE_MATERIALS_BUCKET = process.env.SUPABASE_MATERIALS_BUCKET || "study-materials";

module.exports = {
  ROOT_DIR,
  PUBLIC_DIR,
  DATA_DIR,
  DB_PATH,
  UPLOADS_DIR,
  TEMP_UPLOADS_DIR,
  VIDEOS_DIR,
  MATERIALS_DIR,
  DATABASE_PROVIDER,
  STORAGE_PROVIDER,
  DATABASE_URL,
  DATABASE_SSL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_VIDEOS_BUCKET,
  SUPABASE_MATERIALS_BUCKET,
  isPostgres: DATABASE_PROVIDER === "postgres",
  isSupabaseStorage: STORAGE_PROVIDER === "supabase",
};

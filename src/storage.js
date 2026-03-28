const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const { createClient } = require("@supabase/supabase-js");

const {
  ROOT_DIR,
  UPLOADS_DIR,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_VIDEOS_BUCKET,
  SUPABASE_MATERIALS_BUCKET,
  isSupabaseStorage,
} = require("./config");
const { slugify } = require("./db");

let supabase = null;
if (isSupabaseStorage) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_PROVIDER=supabase.");
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function bucketNameFor(kind) {
  return kind === "material" ? SUPABASE_MATERIALS_BUCKET : SUPABASE_VIDEOS_BUCKET;
}

function fileUrlFromPath(filePath) {
  const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  return `/${relative}`;
}

function resolveLocalUploadPath(publicPath) {
  if (!publicPath || /^https?:\/\//i.test(publicPath)) {
    return null;
  }

  const resolvedPath = path.resolve(ROOT_DIR, publicPath.replace(/^\/+/, ""));
  if (!resolvedPath.startsWith(UPLOADS_DIR)) {
    return null;
  }

  return resolvedPath;
}

function objectPathFor(filePath, originalName, kind) {
  const extension = path.extname(originalName || filePath) || (kind === "material" ? ".pdf" : ".mp4");
  const baseName = slugify(path.basename(originalName || filePath, extension));
  const folder = new Date().toISOString().slice(0, 10);
  return `${folder}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${baseName}${extension.toLowerCase()}`;
}

function mimeTypeFor(filePath, kind, explicitMimeType = "") {
  if (explicitMimeType) {
    return explicitMimeType;
  }

  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".pdf") {
    return "application/pdf";
  }

  if (kind === "video") {
    return "video/mp4";
  }

  return "application/octet-stream";
}

async function ensureStorageReady() {
  if (!isSupabaseStorage || !supabase) {
    return;
  }

  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Failed to inspect Supabase storage buckets: ${error.message}`);
  }

  const existingBuckets = new Set((data || []).map((bucket) => bucket.name));
  for (const bucketName of [SUPABASE_VIDEOS_BUCKET, SUPABASE_MATERIALS_BUCKET]) {
    if (existingBuckets.has(bucketName)) {
      continue;
    }

    const { error: createError } = await supabase.storage.createBucket(bucketName, { public: true });
    if (createError && !/already exists/i.test(createError.message || "")) {
      throw new Error(`Failed to create Supabase bucket "${bucketName}": ${createError.message}`);
    }
  }
}

async function uploadFileToCloud(filePath, { kind, originalName, mimetype }) {
  const bucketName = bucketNameFor(kind);
  const objectPath = objectPathFor(filePath, originalName, kind);
  const buffer = await fs.readFile(filePath);
  const { error } = await supabase.storage.from(bucketName).upload(objectPath, buffer, {
    cacheControl: "3600",
    contentType: mimeTypeFor(filePath, kind, mimetype),
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload ${kind} to Supabase storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function persistUploadedFile(file, { kind }) {
  if (!file) {
    return "";
  }

  if (!isSupabaseStorage) {
    return fileUrlFromPath(file.path);
  }

  try {
    return await uploadFileToCloud(file.path, {
      kind,
      originalName: file.originalname,
      mimetype: file.mimetype,
    });
  } finally {
    await fs.rm(file.path, { force: true }).catch(() => {});
  }
}

async function migrateLocalAsset(publicPath, { kind }) {
  if (!publicPath || /^https?:\/\//i.test(publicPath)) {
    return publicPath || "";
  }

  if (!isSupabaseStorage) {
    return publicPath;
  }

  const localPath = resolveLocalUploadPath(publicPath);
  if (!localPath) {
    return publicPath;
  }

  return uploadFileToCloud(localPath, {
    kind,
    originalName: path.basename(localPath),
  });
}

function parseSupabasePublicUrl(publicUrl) {
  if (!publicUrl || !SUPABASE_URL) {
    return null;
  }

  const prefix = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/`;
  if (!publicUrl.startsWith(prefix)) {
    return null;
  }

  const remainder = publicUrl.slice(prefix.length);
  const separator = remainder.indexOf("/");
  if (separator === -1) {
    return null;
  }

  return {
    bucketName: remainder.slice(0, separator),
    objectPath: remainder.slice(separator + 1),
  };
}

async function safeDeleteUpload(publicPath) {
  if (!publicPath) {
    return;
  }

  const localPath = resolveLocalUploadPath(publicPath);
  if (localPath) {
    await fs.rm(localPath, { force: true }).catch(() => {});
    return;
  }

  if (!isSupabaseStorage || !supabase) {
    return;
  }

  const cloudAsset = parseSupabasePublicUrl(publicPath);
  if (!cloudAsset) {
    return;
  }

  await supabase.storage.from(cloudAsset.bucketName).remove([cloudAsset.objectPath]).catch(() => {});
}

module.exports = {
  fileUrlFromPath,
  persistUploadedFile,
  migrateLocalAsset,
  safeDeleteUpload,
  ensureStorageReady,
  isSupabaseStorage,
};

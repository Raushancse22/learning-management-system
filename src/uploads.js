const crypto = require("node:crypto");
const path = require("path");

const multer = require("multer");

const { slugify } = require("./db");
const { MATERIALS_DIR, TEMP_UPLOADS_DIR, VIDEOS_DIR, isSupabaseStorage } = require("./config");

const upload = multer({
  storage: multer.diskStorage({
    destination(_request, file, callback) {
      if (isSupabaseStorage) {
        callback(null, TEMP_UPLOADS_DIR);
        return;
      }

      if (file.fieldname === "videoFile") {
        callback(null, VIDEOS_DIR);
        return;
      }

      callback(null, MATERIALS_DIR);
    },
    filename(_request, file, callback) {
      const extension = path.extname(file.originalname || "") || (file.fieldname === "materialFile" ? ".pdf" : ".mp4");
      const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${slugify(path.basename(file.originalname || "upload", extension))}${extension.toLowerCase()}`;
      callback(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 150 * 1024 * 1024,
  },
  fileFilter(_request, file, callback) {
    if (file.fieldname === "videoFile" && file.mimetype && !file.mimetype.startsWith("video/")) {
      callback(new Error("Video uploads must use a video file type."));
      return;
    }

    if (
      file.fieldname === "materialFile" &&
      file.mimetype &&
      file.mimetype !== "application/pdf" &&
      !file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      callback(new Error("Study materials must be uploaded as PDF files."));
      return;
    }

    callback(null, true);
  },
});

function cleanupRequestFiles(request) {
  if (!request.files) {
    return;
  }

  Object.values(request.files)
    .flat()
    .forEach((file) => {
      if (file?.path) {
        try {
          require("fs").rmSync(file.path, { force: true });
        } catch {
          // Best-effort cleanup after failed uploads.
        }
      }
    });
}

module.exports = {
  upload,
  cleanupRequestFiles,
};

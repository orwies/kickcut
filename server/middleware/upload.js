'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const VIDEO_DIR = path.join(UPLOAD_DIR, 'videos');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure directories exist
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(THUMB_DIR, { recursive: true });

const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/quicktime',
  'video/x-matroska',
]);

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, VIDEO_DIR);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, THUMB_DIR);
    } else {
      cb(new Error(`Unknown upload field: ${file.fieldname}`), null);
    }
  },
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, unique);
  },
});

/**
 * File type validation using MIME type.
 * Rejects files that are not allowed video or image types.
 */
function fileFilter(req, file, cb) {
  if (file.fieldname === 'video' && ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
    return cb(null, true);
  }
  if (file.fieldname === 'thumbnail' && ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error(`Invalid file type for field "${file.fieldname}": ${file.mimetype}`));
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max per file
    files: 2,
  },
});

module.exports = upload;

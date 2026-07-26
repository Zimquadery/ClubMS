const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../utils/errors');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Buffer in memory (bounded by limits.fileSize) so the real file content can be
// validated against magic bytes before anything touches disk. See upload.routes.
const storage = multer.memoryStorage();

// Cheap early-reject only — mimetype is client-controlled and NOT trusted as an
// authority. The definitive check is content validation in the route handler.
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, GIF, and WebP images are allowed', 400));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Served-upload hardening: uploaded content must never execute script. This
// overrides helmet's global CSP (script-src 'self') for /uploads only, so even
// if a hostile file is ever stored it cannot run scripts or redirect readers.
function uploadsStaticHeaders(_req, res, next) {
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  next();
}

module.exports = { upload, UPLOAD_DIR, uploadsStaticHeaders };

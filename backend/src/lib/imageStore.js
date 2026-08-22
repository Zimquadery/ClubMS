const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../config/upload');
const { getImageExt } = require('../utils/imageExt');
const { AppError } = require('../utils/errors');

// Validates actual content; the on-disk extension comes from the detected
// type, never from the client-supplied filename (defeats x.png.html, spoofed
// mimetypes, .svg, and polyglots).
async function saveUploadedImage(buffer) {
  const ext = getImageExt(buffer);
  if (!ext) {
    throw new AppError('Invalid image file', 400);
  }

  const filename = `${crypto.randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

module.exports = { saveUploadedImage };

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { upload, UPLOAD_DIR } = require('../../config/upload');
const { authMiddleware } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/asyncHandler');
const { getImageExt } = require('../../utils/imageExt');

const router = express.Router();

/**
 * @openapi
 * /upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a file
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 *       400:
 *         description: No file uploaded or invalid image content
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Validate actual content; the on-disk extension comes from the detected
  // type, never from the client-supplied filename (defeats x.png.html, spoofed
  // mimetypes, .svg, and polyglots).
  const ext = getImageExt(req.file.buffer);
  if (!ext) {
    return res.status(400).json({ error: 'Invalid image file' });
  }

  const filename = `${crypto.randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), req.file.buffer);
  res.status(201).json({ url: `/uploads/${filename}` });
}));

module.exports = router;

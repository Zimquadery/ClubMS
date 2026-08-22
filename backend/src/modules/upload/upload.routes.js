const express = require('express');
const { upload } = require('../../config/upload');
const { authMiddleware } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/asyncHandler');
const { saveUploadedImage } = require('../../lib/imageStore');

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

  const url = await saveUploadedImage(req.file.buffer);
  res.status(201).json({ url });
}));

module.exports = router;

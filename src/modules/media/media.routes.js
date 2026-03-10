const express = require('express');
const path = require('path');
const fs = require('fs');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');
const { uploadSingle } = require('../../middleware/upload');
const s3 = require('../../config/storage');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post('/upload', verifyToken, uploadSingle('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { businessId, type } = req.body;
    if (!businessId || !['logo', 'cover', 'gallery'].includes(type)) {
      return res.status(400).json({ error: 'businessId and type (logo|cover|gallery) required' });
    }

    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.user.id },
    });
    if (!business) {
      return res.status(403).json({ error: 'Not your business' });
    }

    const bucket = process.env.HETZNER_BUCKET_NAME;
    const baseUrl = process.env.STORAGE_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    let url;

    if (bucket && req.file.buffer) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const key = `businesses/${businessId}/${type}/${Date.now()}${ext}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );
      url = baseUrl.endsWith('/') ? baseUrl + key : `${baseUrl}/${key}`;
    } else {
      url = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const media = await prisma.media.create({
      data: { businessId, url, type },
    });

    if (type === 'logo') {
      await prisma.business.update({ where: { id: businessId }, data: { logoUrl: url } });
    } else if (type === 'cover') {
      await prisma.business.update({ where: { id: businessId }, data: { coverImage: url } });
    }

    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const media = await prisma.media.findUnique({ where: { id: req.params.id }, include: { business: true } });
    if (!media) return res.status(404).json({ error: 'Not found' });
    if (media.business.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your business' });
    }
    await prisma.media.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

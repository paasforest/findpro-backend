const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Memory storage for S3 upload (buffer in req.file.buffer)
const memoryStorage = multer.memoryStorage();

// Disk fallback when S3 not configured
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const storage = process.env.HETZNER_BUCKET_NAME ? memoryStorage : diskStorage;

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

const uploadSingle = (fieldName) => upload.single(fieldName);

module.exports = { upload, uploadSingle };

const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  endpoint: process.env.HETZNER_STORAGE_ENDPOINT,
  region: process.env.HETZNER_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.HETZNER_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.HETZNER_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

module.exports = s3;

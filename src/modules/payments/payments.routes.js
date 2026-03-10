const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');
const { uploadProof } = require('../../middleware/upload');
const s3 = require('../../config/storage');

const router = express.Router();

const FEATURED_AMOUNT = Number(process.env.FEATURED_AMOUNT) || 79;
const PREMIUM_AMOUNT = Number(process.env.PREMIUM_AMOUNT) || 99;

function getBankDetails() {
  return {
    bankName: process.env.BANK_NAME || 'ABSA BANK',
    branchCode: process.env.BANK_BRANCH_CODE || '632005',
    accountNumber: (process.env.BANK_ACCOUNT_NUMBER || '4115223741').replace(/\s/g, ''),
    accountName: process.env.BANK_ACCOUNT_NAME || 'FindPro',
  };
}

function generateReference() {
  return 'FP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/** Bank details for Featured listing EFT (no auth – shown in modal) */
router.get('/bank-details', (req, res) => {
  res.json(getBankDetails());
});

/** Request Featured upgrade – create payment with reference, return bank details for EFT */
router.post('/request-featured', verifyToken, async (req, res, next) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId required' });
    }
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.user.id },
    });
    if (!business) {
      return res.status(403).json({ error: 'Not your business' });
    }
    let reference;
    let existing = null;
    for (let i = 0; i < 5; i++) {
      reference = generateReference();
      existing = await prisma.payment.findUnique({ where: { reference } });
      if (!existing) break;
    }
    if (existing) {
      return res.status(500).json({ error: 'Could not generate unique reference' });
    }
    const payment = await prisma.payment.create({
      data: {
        businessId,
        amount: FEATURED_AMOUNT,
        currency: 'ZAR',
        status: 'pending',
        paymentMethod: 'eft',
        reference,
        product: 'featured',
      },
    });
    res.status(201).json({
      paymentId: payment.id,
      reference: payment.reference,
      amount: FEATURED_AMOUNT,
      bankDetails: getBankDetails(),
    });
  } catch (err) {
    next(err);
  }
});

/** Request Premium upgrade – same flow as Featured, different amount and product */
router.post('/request-premium', verifyToken, async (req, res, next) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId required' });
    }
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.user.id },
    });
    if (!business) {
      return res.status(403).json({ error: 'Not your business' });
    }
    let reference;
    let existing = null;
    for (let i = 0; i < 5; i++) {
      reference = generateReference();
      existing = await prisma.payment.findUnique({ where: { reference } });
      if (!existing) break;
    }
    if (existing) {
      return res.status(500).json({ error: 'Could not generate unique reference' });
    }
    const payment = await prisma.payment.create({
      data: {
        businessId,
        amount: PREMIUM_AMOUNT,
        currency: 'ZAR',
        status: 'pending',
        paymentMethod: 'eft',
        reference,
        product: 'premium',
      },
    });
    res.status(201).json({
      paymentId: payment.id,
      reference: payment.reference,
      amount: PREMIUM_AMOUNT,
      bankDetails: getBankDetails(),
    });
  } catch (err) {
    next(err);
  }
});

/** Upload proof of payment (image or PDF) */
router.post('/:id/proof', verifyToken, uploadProof, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use image (JPEG, PNG, WebP) or PDF.' });
    }
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { business: true },
    });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (payment.business.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your payment' });
    }
    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    const bucket = process.env.HETZNER_BUCKET_NAME;
    const baseUrl = process.env.STORAGE_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const ext = path.extname(req.file.originalname) || (req.file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    let url;

    if (bucket && req.file.buffer) {
      const key = `payments/${payment.id}/proof${ext}`;
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
      const uploadsDir = path.join(__dirname, '../../../uploads/payments');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `${payment.id}-proof${ext}`;
      const destPath = path.join(uploadsDir, filename);
      if (req.file.buffer) {
        fs.writeFileSync(destPath, req.file.buffer);
      } else if (req.file.path && fs.existsSync(req.file.path)) {
        fs.copyFileSync(req.file.path, destPath);
      }
      url = `${baseUrl}/uploads/payments/${filename}`;
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { proofUrl: url },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/initiate', verifyToken, async (req, res, next) => {
  try {
    const { businessId, plan } = req.body;
    if (!businessId || !plan) {
      return res.status(400).json({ error: 'businessId and plan required' });
    }
    const amount = plan === 'featured' ? FEATURED_AMOUNT : plan === 'premium' ? PREMIUM_AMOUNT : 0;
    const payment = await prisma.payment.create({
      data: { businessId, amount, status: 'pending', reference: 'PF-' + Date.now() },
    });
    const payfastUrl = process.env.PAYFAST_MERCHANT_ID
      ? 'https://www.payfast.co.za/eng/process?merchant_id=' + process.env.PAYFAST_MERCHANT_ID + '&amount=' + amount + '&item_name=FindPro-' + plan
      : null;
    res.json({ payment, redirectUrl: payfastUrl });
  } catch (err) {
    next(err);
  }
});

router.post('/notify', (req, res) => {
  res.status(200).send('OK');
});

router.get('/return', (req, res) => {
  const url = process.env.FRONTEND_URL || 'https://findpro.co.za';
  res.redirect(url + '/featured-upgrade?payment=success');
});

router.get('/cancel', (req, res) => {
  const url = process.env.FRONTEND_URL || 'https://findpro.co.za';
  res.redirect(url + '/featured-upgrade?payment=cancelled');
});

module.exports = router;

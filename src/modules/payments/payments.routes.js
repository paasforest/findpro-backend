const express = require('express');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');

const router = express.Router();

router.post('/initiate', verifyToken, async (req, res, next) => {
  try {
    const { businessId, plan } = req.body;
    if (!businessId || !plan) {
      return res.status(400).json({ error: 'businessId and plan required' });
    }
    const amount = plan === 'featured' ? 50 : plan === 'premium' ? 100 : 0;
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

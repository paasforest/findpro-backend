const express = require('express');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');

const router = express.Router();

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: { businessId: req.params.businessId },
      orderBy: { createdAt: 'desc' },
    });
    if (!listing) return res.status(404).json({ error: 'Not found' });
    res.json(listing);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

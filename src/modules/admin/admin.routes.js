const express = require('express');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/isAdmin');

const router = express.Router();
router.use(verifyToken, isAdmin);

router.get('/stats', async (req, res, next) => {
  try {
    const [totalBusinesses, pendingApproval, featuredListings, totalCities, totalCategories, recentSignups, totalReviews, pendingReviews] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { status: 'pending' } }),
      prisma.business.count({ where: { featured: true } }),
      prisma.city.count(),
      prisma.category.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.review.count(),
      prisma.review.count({ where: { status: 'pending' } }),
    ]);
    res.json({
      totalBusinesses,
      pendingApproval,
      featuredListings,
      totalCities,
      totalCategories,
      recentSignups,
      totalReviews,
      pendingReviews,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/businesses/pending', async (req, res, next) => {
  try {
    const list = await prisma.business.findMany({
      where: { status: 'pending' },
      include: { city: true, businessCategories: { include: { category: true } }, owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.put('/businesses/:id/approve', async (req, res, next) => {
  try {
    await prisma.business.update({
      where: { id: req.params.id },
      data: { status: 'active' },
    });
    await prisma.listing.updateMany({
      where: { businessId: req.params.id },
      data: { status: 'active' },
    });
    res.json({ message: 'Approved' });
  } catch (err) {
    next(err);
  }
});

router.put('/businesses/:id/reject', async (req, res, next) => {
  try {
    await prisma.business.update({
      where: { id: req.params.id },
      data: { status: 'suspended' },
    });
    res.json({ message: 'Rejected' });
  } catch (err) {
    next(err);
  }
});

router.put('/businesses/:id/suspend', async (req, res, next) => {
  try {
    await prisma.business.update({
      where: { id: req.params.id },
      data: { status: 'suspended' },
    });
    res.json({ message: 'Suspended' });
  } catch (err) {
    next(err);
  }
});

router.get('/reviews/pending', async (req, res, next) => {
  try {
    const list = await prisma.review.findMany({
      where: { status: 'pending' },
      include: { business: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.put('/reviews/:id/approve', async (req, res, next) => {
  try {
    await prisma.review.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    });
    res.json({ message: 'Approved' });
  } catch (err) {
    next(err);
  }
});

router.delete('/reviews/:id', async (req, res, next) => {
  try {
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

/** Pending Featured payments (proof uploaded, awaiting confirm) */
router.get('/payments/pending', async (req, res, next) => {
  try {
    const list = await prisma.payment.findMany({
      where: { status: 'pending', amount: { gt: 0 } },
      include: { business: { select: { id: true, name: true, slug: true, featured: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/** Mark payment received → system sets Featured (no pros waiting on admin) */
router.put('/payments/:id/confirm', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { business: true },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'completed' },
      }),
      prisma.business.update({
        where: { id: payment.businessId },
        data: { featured: true },
      }),
    ]);
    res.json({ message: 'Payment confirmed; listing is now Featured' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

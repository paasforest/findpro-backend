const express = require('express');
const { z } = require('zod');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');

const router = express.Router();

const createReviewSchema = z.object({
  businessId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { businessId: req.params.businessId, status: 'approved' },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const { businessId, rating, comment } = parsed.data;

    const existing = await prisma.review.findFirst({
      where: { businessId, userId: req.user.id },
    });
    if (existing) {
      return res.status(400).json({ error: 'You already reviewed this business' });
    }

    const review = await prisma.review.create({
      data: { businessId, userId: req.user.id, rating, comment: comment || null, status: 'pending' },
      include: { user: { select: { name: true } } },
    });
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

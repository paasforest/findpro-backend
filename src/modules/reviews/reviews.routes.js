const express = require('express');
const { z } = require('zod');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');
const { sendEmail } = require('../../utils/sendEmail');

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
    // Phase 6: notify business owner of new review (pending approval)
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { owner: { select: { email: true } } },
      });
      if (business?.owner?.email) {
        await sendEmail({
          to: business.owner.email,
          subject: `New review on ${business.name} – FindPro`,
          text: `Someone left a review on "${business.name}". It's pending approval and will appear on your listing once approved.`,
          html: `Someone left a review on <strong>${business.name}</strong>. It's pending approval and will appear on your listing once approved.`,
        });
      }
    } catch (e) {
      console.warn('New-review notification email failed:', e.message);
    }
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

/** Phase 4: Business owner replies to a review (one reply per review) */
router.put('/:id/reply', verifyToken, async (req, res, next) => {
  try {
    const replyText = typeof req.body?.replyText === 'string' ? req.body.replyText.trim() : '';
    if (!replyText || replyText.length > 1000) {
      return res.status(400).json({ error: 'replyText required, max 1000 characters' });
    }
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: { business: { select: { ownerId: true } } },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.business.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your business' });
    }
    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: { replyText, repliedAt: new Date() },
      include: { user: { select: { name: true } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

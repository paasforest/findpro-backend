const express = require('express');
const { z } = require('zod');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/isAdmin');
const { getUnclaimedUserId } = require('../../utils/ensureUnclaimed');
const { slugify } = require('../../utils/slugify');
const { sendEmail } = require('../../utils/sendEmail');

const router = express.Router();
router.use(verifyToken, isAdmin);

async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.business.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

const unclaimedBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^0[0-9]{9}$/),
  cityId: z.string().uuid(),
  categoryIds: z.array(z.string().uuid()).min(1).max(3),
});

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
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: { owner: { select: { email: true, name: true } } },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    await prisma.business.update({
      where: { id: req.params.id },
      data: { status: 'active' },
    });
    await prisma.listing.updateMany({
      where: { businessId: req.params.id },
      data: { status: 'active' },
    });
    try {
      if (business.owner?.email) {
        const listingUrl = `${process.env.FRONTEND_URL || 'https://findpro.co.za'}/business/${business.slug}`;
        await sendEmail({
          to: business.owner.email,
          subject: `Your listing "${business.name}" is now live – FindPro`,
          text: `Hi ${business.owner.name || 'there'}, your listing "${business.name}" has been approved and is now live on FindPro. View it here: ${listingUrl}. Manage it from your dashboard.`,
          html: `<p>Hi ${business.owner.name || 'there'},</p><p>Your listing <strong>${business.name}</strong> has been approved and is now live on FindPro.</p><p><a href="${listingUrl}">View your listing</a> · <a href="${process.env.FRONTEND_URL || 'https://findpro.co.za'}/dashboard">Dashboard</a></p>`,
        });
      }
    } catch (e) {
      console.warn('Listing-approved email failed:', e.message);
    }
    res.json({ message: 'Approved' });
  } catch (err) {
    next(err);
  }
});

router.put('/businesses/:id/reject', async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: { owner: { select: { email: true, name: true } } },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    await prisma.business.update({
      where: { id: req.params.id },
      data: { status: 'suspended' },
    });
    try {
      if (business.owner?.email) {
        await sendEmail({
          to: business.owner.email,
          subject: `Update on your listing "${business.name}" – FindPro`,
          text: `Hi ${business.owner.name || 'there'}, your listing "${business.name}" was not approved at this time. If you have questions, please reply to this email or contact us.`,
          html: `<p>Hi ${business.owner.name || 'there'},</p><p>Your listing <strong>${business.name}</strong> was not approved at this time.</p><p>If you have questions, please reply to this email or contact us.</p>`,
        });
      }
    } catch (e) {
      console.warn('Listing-rejected email failed:', e.message);
    }
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
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: { business: { include: { owner: { select: { email: true } } } } },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    await prisma.review.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    });
    // Phase 6: notify business owner that review is live
    try {
      if (review.business?.owner?.email) {
        await sendEmail({
          to: review.business.owner.email,
          subject: `A review on ${review.business.name} is now live – FindPro`,
          text: `A review on "${review.business.name}" is now live and visible on your listing.`,
          html: `A review on <strong>${review.business.name}</strong> is now live and visible on your listing.`,
        });
      }
    } catch (e) {
      console.warn('Review-approved notification email failed:', e.message);
    }
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

const bulkImportRowSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().transform((s) => s.replace(/\s/g, '').replace(/^\+27/, '0')).pipe(z.string().regex(/^0[0-9]{9}$/)),
  city: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
});

/** Bulk create unclaimed listings from JSON body. Body: { rows: [ { name, phone, city, category } ] } where city and category are slugs. */
router.post('/businesses/bulk-import', async (req, res, next) => {
  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Body must include rows: [ { name, phone, city, category } ]' });
    }
    const unclaimedId = await getUnclaimedUserId();
    if (!unclaimedId) return res.status(500).json({ error: 'Unclaimed user not configured' });

    const cities = await prisma.city.findMany({ select: { id: true, slug: true } });
    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const cityBySlug = new Map(cities.map((c) => [c.slug.toLowerCase(), c.id]));
    const categoryBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c.id]));

    const results = { created: 0, failed: 0, errors: [] };
    const description = 'Claim this business to add your description and take control of your listing on FindPro.';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const parsed = bulkImportRowSchema.safeParse(row);
      if (!parsed.success) {
        results.failed++;
        results.errors.push({ row: rowNum, name: row?.name, error: parsed.error.flatten().fieldErrors ? JSON.stringify(parsed.error.flatten().fieldErrors) : 'Validation failed' });
        continue;
      }
      const { name, phone, city: citySlug, category: categorySlug } = parsed.data;
      const cityId = cityBySlug.get(citySlug.toLowerCase());
      const categoryId = categoryBySlug.get(categorySlug.toLowerCase());
      if (!cityId) {
        results.failed++;
        results.errors.push({ row: rowNum, name, error: `City not found: ${citySlug}` });
        continue;
      }
      if (!categoryId) {
        results.failed++;
        results.errors.push({ row: rowNum, name, error: `Category not found: ${categorySlug}` });
        continue;
      }

      const existing = await prisma.business.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' }, cityId },
      });
      if (existing) {
        results.failed++;
        results.errors.push({ row: rowNum, name, error: 'A business with this name already exists in this city' });
        continue;
      }

      try {
        const baseSlug = slugify(name);
        const slug = await ensureUniqueSlug(baseSlug);
        await prisma.business.create({
          data: {
            name: name.trim(),
            slug,
            description,
            phone,
            cityId,
            ownerId: unclaimedId,
            status: 'active',
            source: 'manual',
            businessCategories: { create: [{ categoryId }] },
            businessServiceAreas: { create: [{ cityId }] },
            listings: { create: { plan: 'free', status: 'active' } },
          },
        });
        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: rowNum, name, error: err.message || 'Create failed' });
      }
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

/** Create unclaimed listing (admin). Owner = system Unclaimed user; status = active so it appears with "Claim this business". */
router.post('/businesses/unclaimed', async (req, res, next) => {
  try {
    const parsed = unclaimedBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const { name, phone, cityId, categoryIds } = parsed.data;
    const unclaimedId = await getUnclaimedUserId();
    if (!unclaimedId) return res.status(500).json({ error: 'Unclaimed user not configured' });

    const existing = await prisma.business.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' }, cityId },
    });
    if (existing) {
      return res.status(409).json({ error: 'A business with this name already exists in this city.' });
    }

    const baseSlug = slugify(name);
    const slug = await ensureUniqueSlug(baseSlug);
    const description = 'Claim this business to add your description and take control of your listing on FindPro.';

    const business = await prisma.business.create({
      data: {
        name: name.trim(),
        slug,
        description,
        phone,
        cityId,
        ownerId: unclaimedId,
        status: 'active',
        source: 'manual',
        businessCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        businessServiceAreas: { create: [{ cityId }] },
        listings: { create: { plan: 'free', status: 'active' } },
      },
      include: {
        city: true,
        businessCategories: { include: { category: true } },
      },
    });
    res.status(201).json({
      id: business.id,
      name: business.name,
      slug: business.slug,
      city: business.city,
      categories: business.businessCategories.map((bc) => bc.category),
    });
  } catch (err) {
    next(err);
  }
});

/** Pending payments (Featured or Premium – proof uploaded, awaiting confirm) */
router.get('/payments/pending', async (req, res, next) => {
  try {
    const list = await prisma.payment.findMany({
      where: { status: 'pending', amount: { gt: 0 } },
      include: { business: { select: { id: true, name: true, slug: true, featured: true, premium: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // product can be featured | premium | boost | homepage_slot | city_ad – frontend shows label
    res.json(list);
  } catch (err) {
    next(err);
  }
});

const PLAN_DAYS = 30;
const BOOST_DAYS = 7;

/** Mark payment received → set product (featured/premium/boost/homepage_slot/city_ad) + until date */
router.put('/payments/:id/confirm', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { business: { include: { owner: { select: { email: true } } } } },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }
    const product = payment.product || 'featured';
    const days = product === 'boost' ? BOOST_DAYS : PLAN_DAYS;
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    let updateBusiness = {};
    if (product === 'premium') {
      updateBusiness = { premium: true, premiumUntil: until };
    } else if (product === 'boost') {
      updateBusiness = { boosted: true, boostedUntil: until };
    } else if (product === 'homepage_slot') {
      updateBusiness = { homepageSlotUntil: until };
    } else if (product === 'city_ad') {
      updateBusiness = { cityAdUntil: until };
    } else if (product === 'verified') {
      updateBusiness = { verified: true };
    } else {
      updateBusiness = { featured: true, featuredUntil: until };
    }
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'completed' },
      }),
      prisma.business.update({
        where: { id: payment.businessId },
        data: updateBusiness,
      }),
    ]);
    // Phase 6: notify business owner that payment was confirmed
    const productLabels = {
      premium: 'Premium',
      featured: 'Featured',
      boost: 'Boost',
      homepage_slot: 'Homepage slot',
      city_ad: 'City page ad',
      verified: 'Verified',
    };
    const productLabel = productLabels[product] || 'Featured';
    try {
      if (payment.business?.owner?.email) {
        await sendEmail({
          to: payment.business.owner.email,
          subject: `Your ${productLabel} payment for ${payment.business.name} was confirmed – FindPro`,
          text: `Your ${productLabel} payment for "${payment.business.name}" was confirmed. Thank you!`,
          html: `Your <strong>${productLabel}</strong> payment for <strong>${payment.business.name}</strong> was confirmed. Thank you!`,
        });
      }
    } catch (e) {
      console.warn('Payment-confirmed notification email failed:', e.message);
    }
    const messages = {
      premium: 'Payment confirmed; listing is now Premium',
      featured: 'Payment confirmed; listing is now Featured',
      boost: 'Payment confirmed; listing is boosted for 7 days',
      homepage_slot: 'Payment confirmed; listing is on homepage slot',
      city_ad: 'Payment confirmed; listing has city page ad',
      verified: 'Payment confirmed; listing is now Verified',
    };
    res.json({
      message: messages[product] || messages.featured,
      until: product === 'verified' ? undefined : until.toISOString().slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

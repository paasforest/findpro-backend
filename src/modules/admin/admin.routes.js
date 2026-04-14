const express = require('express');
const { z } = require('zod');
const { prisma } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/isAdmin');
const { getUnclaimedUserId } = require('../../utils/ensureUnclaimed');
const { slugify } = require('../../utils/slugify');
const { sendEmail } = require('../../utils/sendEmail');
const claimService = require('../claim/claim.service');

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
        const frontendUrl = process.env.FRONTEND_URL || 'https://findpro.co.za';
        const listingUrl = `${frontendUrl}/business/${business.slug}`;
        const dashboardUrl = `${frontendUrl}/dashboard`;
        await sendEmail({
          to: business.owner.email,
          subject: `Your listing "${business.name}" is now live – FindPro`,
          text: `Hi ${business.owner.name || 'there'},\n\nYour listing "${business.name}" has been approved and is now live on FindPro.\n\nView it: ${listingUrl}\n\nComplete your profile to stand out: add a logo and photos from your dashboard. Listings with photos get more views.\n\nDashboard: ${dashboardUrl}`,
          html: `<p>Hi ${business.owner.name || 'there'},</p><p>Your listing <strong>${business.name}</strong> has been approved and is now live on FindPro.</p><p><a href="${listingUrl}">View your listing</a> · <a href="${dashboardUrl}">Dashboard</a></p><p><strong>Complete your profile:</strong> Add a logo and photos from your dashboard. Listings with photos get more views.</p>`,
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

function normalizeNameForDedup(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** SEO-friendly description templates per category. Helps Google understand the page. */
const DESCRIPTION_TEMPLATES = {
  electricians: (city) =>
    `Professional electricians providing residential and commercial electrical services in ${city} including installations, repairs, COC certificates, fault finding, and emergency electrical work. Claim this listing to add your details.`,
  plumbers: (city) =>
    `Professional plumber in ${city} offering plumbing services including geyser installation, blocked drains, leak detection, bathroom plumbing, and emergency repairs. Claim this listing to add your details.`,
  'solar-installers': (city) =>
    `Solar installer in ${city} offering solar panel installation, inverters, batteries, and maintenance. Claim this listing to add your details.`,
  builders: (city) =>
    `Construction and building services in ${city} including renovations, new builds, extensions, and general contracting. Claim this listing to add your details.`,
  painters: (city) =>
    `Professional painters in ${city} offering interior and exterior painting, spray painting, and finishing services. Claim this listing to add your details.`,
  'cleaning-services': (city) =>
    `Cleaning services in ${city} including house cleaning, carpet cleaning, deep cleaning, and office cleaning. Claim this listing to add your details.`,
  'security-cctv': (city) =>
    `CCTV installation and security services in ${city} including alarms, access control, and electric fencing. Claim this listing to add your details.`,
  'appliance-repair': (city) =>
    `Appliance repair services in ${city} for fridge, washing machine, stove, and other household appliances. Claim this listing to add your details.`,
  'pest-control': (city) =>
    `Pest control services in ${city} including fumigation, rodent control, and termite treatment. Claim this listing to add your details.`,
  'garden-landscaping': (city) =>
    `Garden and landscaping services in ${city} including lawn maintenance, garden design, irrigation, and landscaping. Claim this listing to add your details.`,
};

function getDescriptionForCategory(categorySlug, cityName) {
  const template = DESCRIPTION_TEMPLATES[categorySlug?.toLowerCase()];
  const city = cityName || 'South Africa';
  return template ? template(city) : `Professional service provider in ${city}. Claim this listing to add your description and take control of your listing on FindPro.`;
}

/** Bulk create unclaimed listings from JSON body. Body: { rows: [ { name, phone, city, category } ] } where city and category are slugs. */
router.post('/businesses/bulk-import', async (req, res, next) => {
  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Body must include rows: [ { name, phone, city, category } ]' });
    }
    const unclaimedId = await getUnclaimedUserId();
    if (!unclaimedId) return res.status(500).json({ error: 'Unclaimed user not configured' });

    const cities = await prisma.city.findMany({ select: { id: true, slug: true, name: true } });
    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const cityBySlug = new Map(cities.map((c) => [c.slug.toLowerCase(), c]));
    const categoryBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c.id]));

    const results = { created: 0, failed: 0, errors: [] };

    const seenInBatch = new Set();
    const cityNamesCache = new Map();

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
      const city = cityBySlug.get(citySlug.toLowerCase());
      const cityId = city?.id;
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

      const normalized = normalizeNameForDedup(name);
      const dedupKey = `${normalized}|${cityId}`;
      if (seenInBatch.has(dedupKey)) {
        results.failed++;
        results.errors.push({ row: rowNum, name, error: 'Duplicate in same import (same name + city)' });
        continue;
      }

      if (!cityNamesCache.has(cityId)) {
        cityNamesCache.set(cityId, await prisma.business.findMany({ where: { cityId }, select: { name: true } }));
      }
      const existingInCity = cityNamesCache.get(cityId);
      const alreadyExists = existingInCity.some((b) => normalizeNameForDedup(b.name) === normalized);
      if (alreadyExists) {
        results.failed++;
        results.errors.push({ row: rowNum, name, error: 'A business with this name already exists in this city' });
        continue;
      }
      seenInBatch.add(dedupKey);

      try {
        const baseSlug = slugify(name);
        const slug = await ensureUniqueSlug(baseSlug);
        const description = getDescriptionForCategory(categorySlug, city?.name);
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
        cityNamesCache.get(cityId).push({ name: name.trim() });
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

/** List unclaimed businesses (for outreach). Query: page, limit, contacted (0|1), noWebsiteNoViews (1 = filter: no website OR no views). */
router.get('/businesses/unclaimed', async (req, res, next) => {
  try {
    const unclaimedId = await getUnclaimedUserId();
    if (!unclaimedId) return res.status(500).json({ error: 'Unclaimed user not configured' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const contacted = req.query.contacted;
    const noWebsiteNoViews = req.query.noWebsiteNoViews === '1';
    const where = { ownerId: unclaimedId, status: 'active' };
    if (contacted === '1') where.claimInvitationSentAt = { not: null };
    if (contacted === '0') where.claimInvitationSentAt = null;
    if (noWebsiteNoViews) {
      where.AND = [
        {
          OR: [
            { website: null },
            { website: '' },
            { viewCount: 0 },
          ],
        },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: { city: true, businessCategories: { include: { category: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.business.count({ where }),
    ]);
    res.json({
      data: list,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

/** Send claim invitation email to a business (admin). Body: { email } */
const sendClaimInvitationSchema = z.object({ email: z.string().email() });
router.post('/businesses/:id/send-claim-invitation', async (req, res, next) => {
  try {
    const parsed = sendClaimInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const result = await claimService.sendClaimInvitation(req.params.id, parsed.data.email);
    res.json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
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

    const [city, primaryCategory] = await Promise.all([
      prisma.city.findUnique({ where: { id: cityId }, select: { name: true } }),
      prisma.category.findUnique({ where: { id: categoryIds[0] }, select: { slug: true } }),
    ]);

    const baseSlug = slugify(name);
    const slug = await ensureUniqueSlug(baseSlug);
    const description = getDescriptionForCategory(primaryCategory?.slug, city?.name);

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

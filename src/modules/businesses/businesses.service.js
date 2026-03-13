const { prisma } = require('../../config/db');
const { slugify } = require('../../utils/slugify');
const { paginate } = require('../../utils/paginate');
const { sendEmail } = require('../../utils/sendEmail');
const { getUnclaimedEmail } = require('../../utils/ensureUnclaimed');

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

function buildBusinessResponse(b) {
  const avgReview = b.reviews?.length
    ? b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length
    : null;
  const ownerEmail = b.owner?.email;
  const isUnclaimed = ownerEmail === getUnclaimedEmail();
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    phone: b.phone,
    whatsapp: b.whatsapp,
    email: b.email,
    website: b.website,
    logoUrl: b.logoUrl,
    coverImage: b.coverImage,
    address: b.address,
    featured: b.featured,
    featuredUntil: b.featuredUntil,
    premium: b.premium,
    premiumUntil: b.premiumUntil,
    boosted: b.boosted,
    boostedUntil: b.boostedUntil,
    homepageSlotUntil: b.homepageSlotUntil,
    cityAdUntil: b.cityAdUntil,
    verified: b.verified,
    viewCount: b.viewCount ?? 0,
    isUnclaimed: !!isUnclaimed,
    status: b.status,
    city: b.city ? { id: b.city.id, name: b.city.name, slug: b.city.slug, province: b.city.province } : null,
    categories: (b.businessCategories || []).map((bc) => ({
      id: bc.category?.id,
      name: bc.category?.name,
      slug: bc.category?.slug,
      icon: bc.category?.icon,
    })),
    services: (b.businessServices || []).map((bs) => (bs.service ? { id: bs.service.id, name: bs.service.name, slug: bs.service.slug } : null)).filter(Boolean),
    serviceAreas: (b.businessServiceAreas || []).map((bsa) => (bsa.city ? { id: bsa.city.id, name: bsa.city.name, slug: bsa.city.slug } : null)).filter(Boolean),
    listing: b.listings?.[0] ? { plan: b.listings[0].plan, expiresAt: b.listings[0].expiresAt } : null,
    media: (b.media || []).map((m) => ({ url: m.url, type: m.type })),
    reviews: {
      average: avgReview ? Math.round(avgReview * 10) / 10 : null,
      count: b.reviews?.length ?? 0,
    },
    createdAt: b.createdAt,
  };
}

async function list(filters) {
  const { category, city, featured, status, plan, search, verified, page, limit, sort } = filters || {};
  const where = {};

  if (category) {
    where.businessCategories = { some: { category: { slug: category } } };
  }
  if (city) {
    where.city = { slug: city };
  }
  if (featured === true || featured === 'true') {
    where.featured = true;
  }
  if (status) {
    where.status = status;
  }
  if (plan) {
    where.listings = { some: { plan } };
  }
  if (verified === true || verified === 'true' || verified === '1') {
    where.verified = true;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (!where.status) where.status = 'active';

  const total = await prisma.business.count({ where });
  const { skip, limit: take } = paginate(page, limit, total);

  let orderBy = [{ premium: 'desc' }, { featured: 'desc' }, { boosted: 'desc' }, { cityAdUntil: 'desc' }, { createdAt: 'desc' }];
  if (sort === 'az') orderBy = { name: 'asc' };

  const list = await prisma.business.findMany({
    where,
    skip,
    take,
    orderBy,
    include: {
      city: true,
      owner: { select: { email: true } },
      businessCategories: { include: { category: true } },
      listings: { take: 1, orderBy: { createdAt: 'desc' } },
      media: true,
      reviews: { where: { status: 'approved' } },
    },
  });

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 12;
  return {
    data: list.map(buildBusinessResponse),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

async function getFeatured(limit) {
  const take = limit || 6;
  const list = await prisma.business.findMany({
    where: { status: 'active', OR: [{ featured: true }, { premium: true }] },
    take: take,
    orderBy: [{ premium: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }],
    include: {
      city: true,
      owner: { select: { email: true } },
      businessCategories: { include: { category: true } },
      listings: { take: 1 },
      media: true,
      reviews: true,
    },
  });
  return list.map(buildBusinessResponse);
}

async function getRecent(limit) {
  const take = limit || 6;
  const list = await prisma.business.findMany({
    where: { status: 'active' },
    take: take,
    orderBy: { createdAt: 'desc' },
    include: {
      city: true,
      owner: { select: { email: true } },
      businessCategories: { include: { category: true } },
      listings: { take: 1 },
      media: true,
      reviews: true,
    },
  });
  return list.map(buildBusinessResponse);
}

/** Phase 3: Homepage slot businesses (max 8, active slot only) */
async function getHomepageSlots(limit) {
  const take = Math.min(limit || 8, 8);
  const now = new Date();
  const list = await prisma.business.findMany({
    where: { status: 'active', homepageSlotUntil: { gt: now } },
    take,
    orderBy: { homepageSlotUntil: 'desc' },
    include: {
      city: true,
      owner: { select: { email: true } },
      businessCategories: { include: { category: true } },
      listings: { take: 1 },
      media: true,
      reviews: true,
    },
  });
  return list.map(buildBusinessResponse);
}

async function getBySlug(slug) {
  const b = await prisma.business.findUnique({
    where: { slug, status: 'active' },
    include: {
      city: true,
      owner: { select: { email: true } },
      businessCategories: { include: { category: true } },
      businessServices: { include: { service: true } },
      businessServiceAreas: { include: { city: true } },
      listings: { take: 1, orderBy: { createdAt: 'desc' } },
      media: true,
      reviews: { where: { status: 'approved' }, include: { user: { select: { name: true } } } },
    },
  });
  if (!b) return null;
  return buildBusinessResponse(b);
}

async function create(ownerId, data) {
  const existingSameNameCity = await prisma.business.findFirst({
    where: {
      name: { equals: data.name.trim(), mode: 'insensitive' },
      cityId: data.cityId,
    },
  });
  if (existingSameNameCity) {
    throw Object.assign(
      new Error('A listing with this business name already exists in this city. Use a different name or city.'),
      { statusCode: 409 }
    );
  }

  const baseSlug = slugify(data.name);
  const slug = await ensureUniqueSlug(baseSlug);
  const cityIds = (data.cityIds && data.cityIds.length) ? data.cityIds : [data.cityId];
  const serviceIds = data.serviceIds && data.serviceIds.length ? data.serviceIds : [];

  const business = await prisma.business.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      phone: data.phone,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      website: data.website || null,
      address: data.address || null,
      cityId: data.cityId,
      ownerId,
      status: 'pending',
      source: 'manual',
      businessCategories: {
        create: data.categories.map((categoryId) => ({ categoryId })),
      },
      businessServices: serviceIds.length
        ? { create: serviceIds.map((serviceId) => ({ serviceId })) }
        : undefined,
      businessServiceAreas: { create: cityIds.map((cityId) => ({ cityId })) },
      listings: {
        create: { plan: 'free', status: 'pending' },
      },
    },
    include: {
      city: true,
      businessCategories: { include: { category: true } },
      businessServices: { include: { service: true } },
      businessServiceAreas: { include: { city: true } },
      listings: true,
      media: true,
      reviews: true,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'https://findpro.co.za';
  const adminUrl = `${frontendUrl}/admin`;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      await sendEmail({
        to: adminEmail,
        subject: 'FindPro – New listing pending approval',
        text: `New business "${data.name}" submitted. Review in admin: ${adminUrl}`,
        html: `<p>New business <strong>${data.name}</strong> has been submitted.</p><p><a href="${adminUrl}">Review in Admin</a></p>`,
      });
    } catch (e) {
      console.warn('Admin notification email failed:', e.message);
    }
  }

  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { email: true, name: true } });
  const toEmail = data.email || (owner && owner.email);
  const ownerName = owner?.name || 'there';
  if (toEmail) {
    try {
      const dashboardUrl = `${frontendUrl}/dashboard`;
      await sendEmail({
        to: toEmail,
        subject: 'FindPro – Your listing has been submitted',
        text: `Hi ${ownerName}, your listing "${data.name}" has been submitted and is pending approval. We'll notify you when it's live. Dashboard: ${dashboardUrl}`,
        html: `<p>Hi ${ownerName},</p><p>Your listing <strong>${data.name}</strong> has been submitted and is pending approval. We'll notify you by email when it's live.</p><p><a href="${dashboardUrl}">View your Dashboard</a></p>`,
      });
    } catch (e) {
      console.warn('Owner confirmation email failed:', e.message);
    }
  }

  return buildBusinessResponse(business);
}

async function update(businessId, userId, role, data) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw Object.assign(new Error('Business not found'), { statusCode: 404 });
  if (role !== 'admin' && business.ownerId !== userId) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }

  const updateData = {
    name: data.name !== undefined ? data.name : business.name,
    description: data.description !== undefined ? data.description : business.description,
    phone: data.phone !== undefined ? data.phone : business.phone,
    whatsapp: data.whatsapp !== undefined ? data.whatsapp : business.whatsapp,
    email: data.email !== undefined ? data.email : business.email,
    website: data.website !== undefined ? data.website : business.website,
    address: data.address !== undefined ? data.address : business.address,
    cityId: data.cityId !== undefined ? data.cityId : business.cityId,
  };
  if (data.categories && data.categories.length) {
    await prisma.businessCategory.deleteMany({ where: { businessId } });
    updateData.businessCategories = { create: data.categories.map((categoryId) => ({ categoryId })) };
  }

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: updateData,
    include: {
      city: true,
      businessCategories: { include: { category: true } },
      listings: true,
      media: true,
      reviews: true,
    },
  });
  return buildBusinessResponse(updated);
}

async function remove(businessId, userId, role) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw Object.assign(new Error('Business not found'), { statusCode: 404 });
  if (role !== 'admin' && business.ownerId !== userId) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  await prisma.business.delete({ where: { id: businessId } });
  return { message: 'Deleted' };
}

async function listByOwner(ownerId) {
  const list = await prisma.business.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      city: true,
      owner: { select: { email: true } },
      businessCategories: { include: { category: true } },
      listings: { take: 1, orderBy: { createdAt: 'desc' } },
      media: true,
      reviews: { where: { status: 'approved' } },
    },
  });
  return list.map(buildBusinessResponse);
}

/** Phase 4: Increment view count (no auth; frontend calls when profile is viewed) */
async function recordView(businessId) {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
  if (!business) throw Object.assign(new Error('Business not found'), { statusCode: 404 });
  await prisma.business.update({
    where: { id: businessId },
    data: { viewCount: { increment: 1 } },
  });
  return { ok: true };
}

module.exports = {
  list,
  listByOwner,
  getFeatured,
  getRecent,
  getHomepageSlots,
  getBySlug,
  create,
  update,
  remove,
  recordView,
  buildBusinessResponse,
};

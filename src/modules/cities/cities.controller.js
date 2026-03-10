const { prisma } = require('../../config/db');

async function getAll(req, res, next) {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { businesses: true } } },
    });
    const result = cities.map((c) => ({
      id: c.id,
      name: c.name,
      province: c.province,
      slug: c.slug,
      businessCount: c._count.businesses,
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const city = await prisma.city.findUnique({
      where: { slug },
      include: { _count: { select: { businesses: true } } },
    });
    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }
    res.json({
      ...city,
      businessCount: city._count.businesses,
    });
  } catch (err) {
    next(err);
  }
}

async function getByProvince(req, res, next) {
  try {
    const { name } = req.params;
    const cities = await prisma.city.findMany({
      where: { province: { equals: name, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      include: { _count: { select: { businesses: true } } },
    });
    res.json(cities.map((c) => ({ ...c, businessCount: c._count.businesses })));
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getBySlug, getByProvince };

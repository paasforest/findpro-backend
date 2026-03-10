const { prisma } = require('../../config/db');

async function getAll(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { businessCategories: true } },
      },
    });
    const result = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      businessCount: c._count.businessCategories,
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: { select: { businessCategories: true } },
      },
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({
      ...category,
      businessCount: category._count.businessCategories,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getBySlug };

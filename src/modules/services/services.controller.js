const { prisma } = require('../../config/db');

async function list(req, res, next) {
  try {
    const { categoryId } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    const services = await prisma.service.findMany({
      where,
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
}

module.exports = { list };

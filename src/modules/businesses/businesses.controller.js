const businessesService = require('./businesses.service');

async function list(req, res, next) {
  try {
    const result = await businessesService.list({
      category: req.query.category,
      city: req.query.city,
      featured: req.query.featured,
      status: req.query.status,
      plan: req.query.plan,
      search: req.query.search,
      verified: req.query.verified,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getFeatured(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;
    const data = await businessesService.getFeatured(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getRecent(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;
    const data = await businessesService.getRecent(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getHomepageSlots(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 8;
    const data = await businessesService.getHomepageSlots(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const business = await businessesService.getBySlug(req.params.slug);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(business);
  } catch (err) {
    next(err);
  }
}

async function getByCategory(req, res, next) {
  try {
    const result = await businessesService.list({
      category: req.params.categorySlug,
      verified: req.query.verified,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getByCity(req, res, next) {
  try {
    const result = await businessesService.list({
      city: req.params.citySlug,
      verified: req.query.verified,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getByCategoryAndCity(req, res, next) {
  try {
    const result = await businessesService.list({
      category: req.params.categorySlug,
      city: req.params.citySlug,
      verified: req.query.verified,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
    });
    res.json(result);
  } catch (err) {
    console.warn('[getByCategoryAndCity]', err.message);
    res.status(200).json({ data: [], pagination: { total: 0, totalPages: 0, page: 1 } });
  }
}

async function getMine(req, res, next) {
  try {
    const data = await businessesService.listByOwner(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getMineById(req, res, next) {
  try {
    const business = await businessesService.getByOwnerAndId(req.user.id, req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(business);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const business = await businessesService.create(req.user.id, req.body);
    res.status(201).json(business);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const business = await businessesService.update(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body
    );
    res.json(business);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await businessesService.remove(req.params.id, req.user.id, req.user.role);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

async function recordView(req, res, next) {
  try {
    await businessesService.recordView(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
}

module.exports = {
  list,
  getFeatured,
  getRecent,
  getHomepageSlots,
  getBySlug,
  getByCategory,
  getByCity,
  getByCategoryAndCity,
  getMine,
  getMineById,
  create,
  update,
  remove,
  recordView,
};

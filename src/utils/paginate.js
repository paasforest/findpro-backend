function paginate(page = 1, limit = 12, total) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (pageNum - 1) * limitNum;
  const totalPages = Math.ceil(total / limitNum);
  return {
    page: pageNum,
    limit: limitNum,
    skip,
    total,
    totalPages,
    hasMore: pageNum < totalPages,
  };
}

module.exports = { paginate };

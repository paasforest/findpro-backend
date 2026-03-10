const express = require('express');
const categoriesController = require('./categories.controller');

const router = express.Router();

router.get('/', categoriesController.getAll);
router.get('/:slug', categoriesController.getBySlug);

module.exports = router;

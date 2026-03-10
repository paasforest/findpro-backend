const express = require('express');
const citiesController = require('./cities.controller');

const router = express.Router();

router.get('/', citiesController.getAll);
router.get('/province/:name', citiesController.getByProvince);
router.get('/:slug', citiesController.getBySlug);

module.exports = router;

const express = require('express');
const servicesController = require('./services.controller');

const router = express.Router();
router.get('/', servicesController.list);

module.exports = router;

const express = require('express');
const { z } = require('zod');
const businessesController = require('./businesses.controller');
const { verifyToken } = require('../../middleware/auth');

const router = express.Router();

const createBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(50).max(1000),
  phone: z.string().regex(/^0[0-9]{9}$/),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  cityId: z.string().uuid(),
  categories: z.array(z.string().uuid()).min(1).max(3),
  serviceIds: z.array(z.string().uuid()).max(20).optional(),
  cityIds: z.array(z.string().uuid()).max(50).optional(), // service areas (cities this business serves)
});

function validateCreate(req, res, next) {
  const result = createBusinessSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten().fieldErrors });
  }
  req.body = result.data;
  next();
}

router.get('/', businessesController.list);
router.get('/featured', businessesController.getFeatured);
router.get('/recent', businessesController.getRecent);
router.get('/homepage-slots', businessesController.getHomepageSlots);
router.get('/mine', verifyToken, businessesController.getMine);
router.get('/category/:categorySlug', businessesController.getByCategory);
router.get('/city/:citySlug', businessesController.getByCity);
router.get('/category/:categorySlug/city/:citySlug', businessesController.getByCategoryAndCity);
router.post('/:id/record-view', businessesController.recordView);
router.get('/:slug', businessesController.getBySlug);

router.post('/', verifyToken, validateCreate, businessesController.create);
router.put('/:id', verifyToken, businessesController.update);
router.delete('/:id', verifyToken, businessesController.remove);

module.exports = router;
